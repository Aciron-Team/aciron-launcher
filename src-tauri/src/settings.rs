use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub fn launcher_root() -> PathBuf {
    let base = dirs::config_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("."));
    base.join(".acironlauncher")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {

    pub java_path: String,

    pub ram_mb: u32,

    pub window_width: u32,
    pub window_height: u32,

    pub game_dir: String,
    pub versions_dir: String,
    pub builds_dir: String,

    pub username: String,

    #[serde(default)]
    pub hide_on_launch: bool,

    #[serde(default)]
    pub background_anim: Option<bool>,

    #[serde(default = "default_true")]
    pub discord_rpc: bool,

    #[serde(default = "default_true")]
    pub autoadd_server: bool,

    #[serde(default)]
    pub jvm_args: String,

    #[serde(default = "default_true")]
    pub auto_update_check: bool,

    #[serde(default)]
    pub fullscreen: bool,
}

fn default_true() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        let root = launcher_root();
        Settings {
            java_path: String::new(),
            ram_mb: 4096,
            window_width: 854,
            window_height: 480,
            game_dir: root.to_string_lossy().into_owned(),
            versions_dir: root.join("versions").to_string_lossy().into_owned(),
            builds_dir: root.join("builds").to_string_lossy().into_owned(),
            username: "Player".into(),
            hide_on_launch: false,
            background_anim: None,
            discord_rpc: true,
            autoadd_server: true,
            jvm_args: String::new(),
            auto_update_check: true,
            fullscreen: false,
        }
    }
}

fn settings_file() -> PathBuf {
    launcher_root().join("settings.json")
}

pub fn ensure_dirs(s: &Settings) {
    for dir in [&s.game_dir, &s.versions_dir, &s.builds_dir] {
        let _ = std::fs::create_dir_all(dir);
    }
}

fn is_java(path: &Path) -> bool {
    path.is_file()
}

#[tauri::command]
pub fn detect_java() -> String {
    let exe = if cfg!(windows) { "java.exe" } else { "java" };

    if let Ok(home) = std::env::var("JAVA_HOME") {
        let p = PathBuf::from(home).join("bin").join(exe);
        if is_java(&p) {
            return p.to_string_lossy().into_owned();
        }
    }

    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let p = dir.join(exe);
            if is_java(&p) {
                return p.to_string_lossy().into_owned();
            }
        }
    }

    if cfg!(windows) {
        let roots = [
            r"C:\Program Files\Java",
            r"C:\Program Files\Eclipse Adoptium",
            r"C:\Program Files\Microsoft\jdk",
            r"C:\Program Files\Zulu",
            r"C:\Program Files (x86)\Java",
        ];
        for root in roots {
            if let Ok(entries) = std::fs::read_dir(root) {
                for e in entries.flatten() {
                    let p = e.path().join("bin").join(exe);
                    if is_java(&p) {
                        return p.to_string_lossy().into_owned();
                    }
                }
            }
        }
    }

    String::new()
}

pub fn load_settings() -> Settings {
    let file = settings_file();
    let mut s = match std::fs::read_to_string(&file) {
        Ok(txt) => serde_json::from_str::<Settings>(&txt).unwrap_or_default(),
        Err(_) => Settings::default(),
    };

    if s.java_path.is_empty() {
        s.java_path = detect_java();
    }
    ensure_dirs(&s);
    s
}

#[tauri::command]
pub fn get_settings() -> Settings {
    load_settings()
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    ensure_dirs(&settings);
    let file = settings_file();
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let txt = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&file, txt).map_err(|e| e.to_string())?;

    crate::discord::set_enabled(settings.discord_rpc);
    Ok(())
}

#[tauri::command]
pub fn default_settings() -> Settings {
    let mut s = Settings::default();
    s.java_path = detect_java();
    s
}

#[cfg(windows)]
fn total_ram_gb() -> f64 {
    #[repr(C)]
    struct MemoryStatusEx {
        dw_length: u32,
        dw_memory_load: u32,
        ull_total_phys: u64,
        ull_avail_phys: u64,
        ull_total_page_file: u64,
        ull_avail_page_file: u64,
        ull_total_virtual: u64,
        ull_avail_virtual: u64,
        ull_avail_extended_virtual: u64,
    }
    extern "system" {
        fn GlobalMemoryStatusEx(buffer: *mut MemoryStatusEx) -> i32;
    }
    unsafe {
        let mut ms: MemoryStatusEx = std::mem::zeroed();
        ms.dw_length = std::mem::size_of::<MemoryStatusEx>() as u32;
        if GlobalMemoryStatusEx(&mut ms) != 0 {
            ms.ull_total_phys as f64 / 1024.0 / 1024.0 / 1024.0
        } else {
            8.0
        }
    }
}

#[cfg(not(windows))]
fn total_ram_gb() -> f64 {
    8.0
}

#[tauri::command]
pub fn hardware_capable() -> bool {
    let ram = total_ram_gb();
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    ram >= 8.0 && cores >= 4
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let _ = std::fs::create_dir_all(&p);
    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(&p)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&p)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&p)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
