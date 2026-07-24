use crate::accounts::{self, Account};
use serde_json::{json, Value};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const CLIENT_ID: &str = "3c12b570-456a-40eb-890c-c6b0bbd91f65";

const DEVICE_CODE_URL: &str =
    "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const SCOPE: &str = "XboxLive.signin offline_access";

fn http() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("AcironLauncher/0.1")
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_microsoft_account(app: AppHandle) -> Result<Account, String> {
    let cl = http()?;

    let dc: Value = cl
        .post(DEVICE_CODE_URL)
        .form(&[("client_id", CLIENT_ID), ("scope", SCOPE)])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err) = dc.get("error").and_then(|v| v.as_str()) {
        let desc = dc["error_description"].as_str().unwrap_or(err);
        return Err(format!("Microsoft: {desc}"));
    }

    let device_code = dc["device_code"].as_str().unwrap_or("").to_string();
    let user_code = dc["user_code"].as_str().unwrap_or("").to_string();
    let verification_uri = dc["verification_uri"]
        .as_str()
        .unwrap_or("https://microsoft.com/link")
        .to_string();
    let interval = dc["interval"].as_u64().unwrap_or(5);
    let expires_in = dc["expires_in"].as_u64().unwrap_or(900);

    let _ = app.emit(
        "ms-device-code",
        json!({
            "user_code": user_code,
            "verification_uri": verification_uri,
            "expires_in": expires_in,
        }),
    );

    let mut waited = 0u64;
    let mut delay = interval;
    let (ms_access, refresh) = loop {
        tokio::time::sleep(Duration::from_secs(delay)).await;
        waited += delay;
        if waited > expires_in {
            return Err("Время ожидания входа истекло, попробуйте снова".into());
        }

        let tok: Value = cl
            .post(TOKEN_URL)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
                ("client_id", CLIENT_ID),
                ("device_code", &device_code),
            ])
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?;

        if let Some(at) = tok["access_token"].as_str() {
            let rt = tok["refresh_token"].as_str().unwrap_or("").to_string();
            break (at.to_string(), rt);
        }
        match tok["error"].as_str() {
            Some("authorization_pending") => continue,
            Some("slow_down") => {
                delay += 5;
                continue;
            }
            Some("expired_token") => return Err("Код входа истёк, попробуйте снова".into()),
            Some("authorization_declined") => return Err("Вход отменён".into()),
            Some(e) => return Err(format!("Microsoft: {e}")),
            None => return Err("Неизвестный ответ Microsoft".into()),
        }
    };

    finish_login(&cl, &ms_access, &refresh).await
}

pub async fn refresh_account(refresh_token: &str) -> Result<Account, String> {
    if refresh_token.is_empty() {
        return Err("Нет refresh-токена — войдите в Microsoft заново".into());
    }
    let cl = http()?;
    let tok: Value = cl
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "refresh_token"),
            ("client_id", CLIENT_ID),
            ("refresh_token", refresh_token),
            ("scope", SCOPE),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let ms_access = tok["access_token"]
        .as_str()
        .ok_or("Сессия Microsoft истекла — войдите заново")?
        .to_string();
    let new_refresh = tok["refresh_token"]
        .as_str()
        .unwrap_or(refresh_token)
        .to_string();

    finish_login(&cl, &ms_access, &new_refresh).await
}

async fn finish_login(
    cl: &reqwest::Client,
    ms_access: &str,
    refresh: &str,
) -> Result<Account, String> {

    let xbl: Value = cl
        .post("https://user.auth.xboxlive.com/user/authenticate")
        .json(&json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={ms_access}"),
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let xbl_token = xbl["Token"]
        .as_str()
        .ok_or("Xbox Live: не удалось получить токен")?
        .to_string();

    let xsts: Value = cl
        .post("https://xsts.auth.xboxlive.com/xsts/authorize")
        .json(&json!({
            "Properties": { "SandboxId": "RETAIL", "UserTokens": [xbl_token] },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(xerr) = xsts.get("XErr").and_then(|v| v.as_u64()) {
        let msg = match xerr {
            2148916233 => "У аккаунта Microsoft нет профиля Xbox — создайте его на xbox.com",
            2148916235 => "Xbox Live недоступен в вашем регионе",
            2148916236 | 2148916237 => "Требуется подтверждение возраста для Xbox",
            2148916238 => "Детский аккаунт: добавьте его в семейную группу Microsoft",
            _ => "Не удалось авторизоваться в Xbox (XSTS)",
        };
        return Err(msg.into());
    }
    let xsts_token = xsts["Token"]
        .as_str()
        .ok_or("XSTS: не удалось получить токен")?
        .to_string();
    let uhs = xsts["DisplayClaims"]["xui"][0]["uhs"]
        .as_str()
        .or_else(|| xbl["DisplayClaims"]["xui"][0]["uhs"].as_str())
        .ok_or("XSTS: отсутствует uhs")?
        .to_string();

    let mc_resp = cl
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .json(&json!({ "identityToken": format!("XBL3.0 x={uhs};{xsts_token}") }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let mc_status = mc_resp.status();
    let mc_text = mc_resp.text().await.unwrap_or_default();
    let mc: Value = serde_json::from_str(&mc_text).unwrap_or(Value::Null);
    let mc_token = mc["access_token"]
        .as_str()
        .ok_or_else(|| {
            let snippet: String = mc_text.chars().take(300).collect();
            format!("Minecraft login [{mc_status}]: {snippet}")
        })?
        .to_string();

    let resp = cl
        .get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(&mc_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err("На этом аккаунте Microsoft не куплен Minecraft".into());
    }
    let profile: Value = resp.json().await.map_err(|e| e.to_string())?;
    let uuid = profile["id"].as_str().unwrap_or("").to_string();
    let name = profile["name"].as_str().unwrap_or("Player").to_string();
    let skin_url = profile["skins"]
        .as_array()
        .and_then(|arr| {
            arr.iter()
                .find(|s| s["state"].as_str() == Some("ACTIVE"))
                .or_else(|| arr.first())
        })
        .and_then(|s| s["url"].as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| format!("https://crafatar.com/skins/{uuid}"));

    let acc = Account {
        id: accounts::gen_id(),
        username: name,
        uuid,
        kind: "microsoft".into(),
        access_token: mc_token,
        skin_url,
        refresh_token: refresh.to_string(),
    };
    Ok(accounts::save_account(acc))
}
