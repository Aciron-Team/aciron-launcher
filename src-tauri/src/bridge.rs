

use std::sync::OnceLock;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

struct Bridge {
    port: u16,
    key: String,
}

fn bridge() -> &'static OnceLock<Bridge> {
    static B: OnceLock<Bridge> = OnceLock::new();
    &B
}

/// Адрес моста для аргумента агента. None — мост не поднялся.
pub fn endpoint() -> Option<String> {
    bridge()
        .get()
        .map(|b| format!("http://127.0.0.1:{}/peers?k={}", b.port, b.key))
}

fn random_key() -> String {
    let mut raw = [0u8; 16];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut raw);
    raw.iter().map(|b| format!("{b:02x}")).collect()
}

/// Отвечает на один запрос и закрывает соединение.
async fn serve_one(mut stream: TcpStream, key: &str) {
    let mut buf = [0u8; 2048];
    let n = match stream.read(&mut buf).await {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let req = String::from_utf8_lossy(&buf[..n]);
    let line = req.lines().next().unwrap_or("");
    let path = line.split_whitespace().nth(1).unwrap_or("");

    let reply = |code: &str, body: String| {
        format!(
            "HTTP/1.1 {code}\r\nContent-Type: application/json; charset=utf-8\r\n\
             Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.as_bytes().len()
        )
    };

    // Ключ сверяем всегда: без него мост — открытый источник данных для любой
    // программы на машине, включая страницу в браузере.
    let ok_key = path
        .split('?')
        .nth(1)
        .map(|q| q.split('&').any(|kv| kv == format!("k={key}")))
        .unwrap_or(false);

    let out = if !path.starts_with("/peers") {
        reply("404 Not Found", "{}".into())
    } else if !ok_key {
        reply("403 Forbidden", "{}".into())
    } else {
        let peers = crate::realtime::peers();
        let names: Vec<&str> = peers.iter().map(|p| p.username.as_str()).collect();
        reply(
            "200 OK",
            serde_json::json!({ "peers": names }).to_string(),
        )
    };

    let _ = stream.write_all(out.as_bytes()).await;
    let _ = stream.flush().await;
}

/// Поднимает мост. Порт выбирает система — фиксированный занял бы чужой процесс
/// или конфликтовал со вторым лаунчером.
pub async fn serve() {
    let listener = match TcpListener::bind("127.0.0.1:0").await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[bridge] не удалось открыть порт: {e} — значки в игре работать не будут");
            return;
        }
    };
    let port = match listener.local_addr() {
        Ok(a) => a.port(),
        Err(_) => return,
    };
    let key = random_key();
    let _ = bridge().set(Bridge { port, key: key.clone() });
    // Полный адрес с ключом печатаем только в отладочной сборке: в релизе ему в
    // логах не место, а при разработке без него не проверить ни мост, ни агента.
    if cfg!(debug_assertions) {
        eprintln!("[bridge] слушает {}", endpoint().unwrap_or_default());
    } else {
        eprintln!("[bridge] слушает 127.0.0.1:{port}");
    }

    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                // Принимаем только с петли. Слушаем и так на 127.0.0.1, это
                // страховка от неверной настройки в будущем.
                if !addr.ip().is_loopback() {
                    continue;
                }
                let k = key.clone();
                tokio::spawn(async move { serve_one(stream, &k).await });
            }
            Err(e) => {
                eprintln!("[bridge] ошибка приёма: {e}");
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
        }
    }
}
