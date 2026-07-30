

const BUILD_ENV: [&str; 5] = [
    "ACIRON_ID_URL",
    "ACIRON_CF_PROXY_URL",
    "ACIRON_CLIENT_KEY",
    "ACIRON_PROXY_TOKEN",
    "ACIRON_MS_CLIENT_ID",
];

fn main() {
    for var in BUILD_ENV {
        println!("cargo:rerun-if-env-changed={var}");
    }
    tauri_build::build()
}
