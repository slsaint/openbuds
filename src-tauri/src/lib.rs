//! Tauri backend for OpenBuds.
//!
//! This is intentionally a *thin* layer. All protocol / device logic lives in
//! `openscq30-lib`. We only:
//!   1. own an `OpenSCQ30Session` (sqlite-backed registry of paired devices),
//!   2. hold the currently-connected `OpenSCQ30Device` in managed state,
//!   3. expose a handful of `#[tauri::command]`s to the React frontend, and
//!   4. bridge the lib's `tokio::sync::watch` change notifications to Tauri events.
//!
//! The entire UI is driven by the device's generic settings model
//! (`settings_by_category()` -> `set_setting_values()`), so there is no
//! per-device code here or in the frontend.

mod commands;
mod state;

use state::AppState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Database lives in the OS app-data dir, e.g.
            //   Linux:   ~/.local/share/io.openbuds.app/database.sqlite
            //   Windows: %APPDATA%\io.openbuds.app\database.sqlite
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("database.sqlite");

            // Session creation is async; block the setup hook until it's ready.
            let state = tauri::async_runtime::block_on(AppState::new(db_path))
                .expect("failed to initialize OpenSCQ30 session");
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_device_models,
            commands::list_devices,
            commands::paired_devices,
            commands::pair,
            commands::unpair,
            commands::connect,
            commands::disconnect,
            commands::get_settings,
            commands::set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
