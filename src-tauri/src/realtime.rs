

use serde_json::json;
use sha2::{Digest, Sha256};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::{client::IntoClientRequest, Message};
use futures::{SinkExt, StreamExt};

#[derive(Clone, Default, serde::Serialize)]
pub struct Peer {
    pub id: String,
    pub username: String,
}

struct State {

    room: Option<String>,

    peers: Vec<Peer>,
    connected: bool,

    tx: Option<mpsc::UnboundedSender<String>>,
}

impl Default for State {
    fn default() -> Self {
        Self { room: None, peers: Vec::new(), connected: false, tx: None }
    }
}

fn state() -> &'static Mutex<State> {
    static S: OnceLock<Mutex<State>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(State::default()))
}

/// Хеш адреса сервера — идентификатор комнаты.
///
/// Хешируем на нашей стороне: комнаты работают на равенстве, поэтому хеша
/// достаточно, а сам адрес в сервис по этому пути не уезжает. Он попадает туда
/// только через presence.server и только если человек не выключил показ сервера.
fn room_key(address: &str) -> Option<String> {
    let norm = address.trim().to_lowercase();
    if norm.is_empty() {
        return None;
    }
    let digest = Sha256::digest(norm.as_bytes());
    Some(hex(&digest)[..24].to_string())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Текущий сервер сменился (или игра закрылась). Вызывается из presence.rs.
pub fn set_server(address: Option<&str>) {
    let key = address.and_then(room_key);
    let tx = {
        let mut s = match state().lock() {
            Ok(s) => s,
            Err(_) => return,
        };
        if s.room == key {
            return; // ничего не изменилось — молчим
        }
        s.room = key.clone();
        // Соседи от прошлой комнаты недействительны: там уже не мы.
        s.peers.clear();
        s.tx.clone()
    };
    if let Some(tx) = tx {
        let _ = tx.send(key.unwrap_or_default());
    }
}

/// Соседи по текущему серверу.
///
/// Пока не вызывается: состав комнаты нужен агенту игры для значков, а мост к
/// нему — следующий шаг. Список поддерживается уже сейчас, потому что он и есть
/// содержимое событий join/leave — собирать его задним числом было бы нечем.
#[allow(dead_code)]
pub fn peers() -> Vec<Peer> {
    state().lock().map(|s| s.peers.clone()).unwrap_or_default()
}

/// Живо ли соединение. Панель друзей по этому решает, нужен ли запасной опрос.
#[tauri::command]
pub fn realtime_connected() -> bool {
    state().lock().map(|s| s.connected).unwrap_or(false)
}

/// http(s):// → ws(s)://, путь /ws.
fn ws_url() -> String {
    let base = crate::aciron::base();
    let scheme = if base.starts_with("https://") { "wss://" } else { "ws://" };
    let rest = base
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_end_matches('/');
    format!("{scheme}{rest}/ws")
}

fn apply_message(app: &AppHandle, text: &str) {
    let v: serde_json::Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(_) => return,
    };
    let parse_peer = |p: &serde_json::Value| Peer {
        id: p["id"].as_str().unwrap_or_default().to_string(),
        username: p["username"].as_str().unwrap_or_default().to_string(),
    };
    match v["t"].as_str().unwrap_or("") {
        // Состав комнаты приходит один раз — в момент входа. Дальше только дельты.
        "peers" => {
            let list = v["list"].as_array().map(|a| a.iter().map(parse_peer).collect());
            if let Ok(mut s) = state().lock() {
                s.peers = list.unwrap_or_default();
            }
        }
        "join" => {
            let p = parse_peer(&v["user"]);
            if let Ok(mut s) = state().lock() {
                if !p.id.is_empty() && !s.peers.iter().any(|x| x.id == p.id) {
                    s.peers.push(p);
                }
            }
        }
        "leave" => {
            let id = v["id"].as_str().unwrap_or_default().to_string();
            if let Ok(mut s) = state().lock() {
                s.peers.retain(|x| x.id != id);
            }
        }
        // Сервис не шлёт снимок присутствия — только «перечитай». Считать его
        // здесь значило бы завести вторую версию правды рядом с серверной.
        "friends" => {
            let _ = app.emit("friends-changed", ());
        }
        _ => {}
    }
}

/// Одна попытка: подключиться и качать сообщения, пока соединение живо.
async fn run_once(app: &AppHandle, token: &str) -> Result<(), String> {
    let mut req = ws_url().into_client_request().map_err(|e| e.to_string())?;
    req.headers_mut().insert(
        "Authorization",
        format!("Bearer {token}")
            .parse()
            .map_err(|_| "плохой токен".to_string())?,
    );

    let (stream, _) = tokio_tungstenite::connect_async(req)
        .await
        .map_err(|e| e.to_string())?;
    let (mut write, mut read) = stream.split();

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let start_room = {
        let mut s = state().lock().map_err(|_| "состояние занято")?;
        s.connected = true;
        s.tx = Some(tx);
        s.room.clone()
    };
    let _ = app.emit("realtime-state", true);
    // Успех тоже пишем: без него в логе видны только падения, и «тишина» одинаково
    // означает и «всё хорошо», и «даже не пытались» (нет аккаунта Aciron ID).
    eprintln!("[realtime] соединение установлено");

    // Комната, если она уже известна: соединение могло подняться посреди игры.
    if let Some(room) = start_room {
        let _ = write.send(Message::Text(json!({"t":"room","room":room}).to_string())).await;
    }

    let result = loop {
        tokio::select! {
            // Смена сервера из presence.rs.
            Some(room) = rx.recv() => {
                let payload = if room.is_empty() {
                    json!({"t":"room","room":null})
                } else {
                    json!({"t":"room","room":room})
                };
                if write.send(Message::Text(payload.to_string())).await.is_err() {
                    break Err("соединение разорвано".to_string());
                }
            }
            msg = read.next() => match msg {
                Some(Ok(Message::Text(t))) => apply_message(app, &t),
                // На ping отвечает сама библиотека; нам важно лишь не выйти.
                Some(Ok(Message::Ping(_))) | Some(Ok(Message::Pong(_))) => {}
                Some(Ok(Message::Close(_))) | None => break Ok(()),
                Some(Err(e)) => break Err(e.to_string()),
                _ => {}
            },
        }
    };

    if let Ok(mut s) = state().lock() {
        s.connected = false;
        s.tx = None;
        s.peers.clear();
    }
    let _ = app.emit("realtime-state", false);
    result
}

/// Фоновый цикл: держит соединение, переподключается с нарастающей паузой.
pub async fn connect_loop(app: AppHandle) {
    // Пауза растёт до минуты: сервис может лежать, и долбить его раз в секунду
    // всеми клиентами сразу — верный способ не дать ему подняться.
    const MIN_BACKOFF: Duration = Duration::from_secs(2);
    const MAX_BACKOFF: Duration = Duration::from_secs(60);
    let mut backoff = MIN_BACKOFF;

    loop {
        let token = match crate::accounts::active_account() {
            Some(a) if a.kind == "aciron" && !a.aciron_token.is_empty() => a.aciron_token,
            // Аккаунта Aciron ID нет — держать соединение не для кого.
            _ => {
                tokio::time::sleep(Duration::from_secs(15)).await;
                continue;
            }
        };

        match run_once(&app, &token).await {
            // Соединение прожило и закрылось штатно — пробуем сразу.
            Ok(()) => backoff = MIN_BACKOFF,
            Err(e) => {
                eprintln!("[realtime] соединение потеряно: {e}");
                backoff = (backoff * 2).min(MAX_BACKOFF);
            }
        }
        tokio::time::sleep(backoff).await;
    }
}
