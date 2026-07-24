mod accounts;
mod builds;
mod discord;
mod launcher;
mod microsoft;
mod modrinth;
mod settings;
mod update;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|_app| {

            std::thread::spawn(discord::init);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings::get_settings,
            settings::save_settings,
            settings::default_settings,
            settings::detect_java,
            settings::open_folder,
            settings::hardware_capable,
            launcher::launch_game,
            launcher::launch_build,
            launcher::stop_game,
            launcher::list_versions,
            launcher::get_installed_versions,
            launcher::add_installed_version,
            launcher::remove_installed_version,
            accounts::get_accounts,
            accounts::add_offline_account,
            accounts::remove_account,
            accounts::set_active_account,
            microsoft::add_microsoft_account,
            builds::get_builds,
            builds::create_build,
            builds::delete_build,
            builds::open_build_folder,
            builds::remove_mod,
            builds::toggle_mod,
            builds::refresh_build_content,
            builds::set_build_image,
            builds::get_build_image,
            modrinth::modrinth_search,
            modrinth::modrinth_categories,
            modrinth::modrinth_install,
            modrinth::modrinth_install_version,
            modrinth::modrinth_project,
            modrinth::project_versions,
            modrinth::change_build_version,
            modrinth::install_modpack,
            update::check_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
