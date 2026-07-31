pub mod commands;
pub mod state;

use state::AppState;
use tauri::Emitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::fs_ops::read_file,
            commands::fs_ops::read_file_base64,
            commands::fs_ops::write_file,
            commands::fs_ops::file_exists,
            commands::fs_ops::read_dir,
            commands::fs_ops::create_dir,
            commands::fs_ops::remove_file,
            commands::fs_ops::remove_dir,
            commands::fs_ops::rename_file,
            commands::fs_ops::copy_file,
            commands::dialog_ops::get_default_path,
            commands::dialog_ops::save_default_path,
            commands::zip_ops::extract_zip,
            commands::settings_ops::save_settings,
            commands::settings_ops::load_settings,
            commands::settings_ops::update_window_state,
            commands::settings_ops::get_window_state,
            commands::settings_ops::get_impress_version,
            commands::settings_ops::set_impress_version,
            commands::presentation::get_app_path,
            commands::presentation::get_user_data_path,
            commands::presentation::get_presentation_dir,
            commands::presentation::check_style_css,
            commands::media_server::start_media_server,
            commands::media_server::stop_media_server,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            let menu = build_app_menu(&handle).expect("failed to build menu");
            let app_handle = handle.clone();
            handle.on_menu_event(move |_app, event| {
                let _ = app_handle.emit("menu-event", event.id().0.as_str());
            });
            handle.set_menu(menu).expect("failed to set menu");

            let _ = load_initial_settings(&handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_app_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let load_item = MenuItemBuilder::with_id("menu-load", "Load Presentation\tCtrl+O")
        .build(app)?;
    let refresh_item = MenuItemBuilder::with_id("menu-refresh", "Refresh\tF5")
        .build(app)?;
    let devtools_item = MenuItemBuilder::with_id("menu-devtools", "Toggle DevTools\tCtrl+Shift+I")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&load_item)
        .item(&refresh_item)
        .separator()
        .item(&devtools_item)
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&file_menu)
        .build()?;

    Ok(menu)
}

fn load_initial_settings(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let config_dir = dirs::config_dir()
        .or_else(|| dirs::data_dir())
        .ok_or_else(|| "Cannot determine config directory".to_string())?;
    let settings_path = config_dir.join("impressPlayer").join("settings.json");

    if settings_path.exists() {
        let data = std::fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        let settings: serde_json::Value = serde_json::from_str(&data)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;

        if let Some(windowstate) = settings.get("windowstate") {
            if let Ok(ws) =
                serde_json::from_value::<state::WindowStates>(windowstate.clone())
            {
                let app_state = app_handle.state::<AppState>();
                *app_state.window_states.lock().unwrap() = ws;
            }
        }
        if let Some(dp) = settings.get("defaultPath").and_then(|v| v.as_str()) {
            let app_state = app_handle.state::<AppState>();
            *app_state.default_path.lock().unwrap() = Some(dp.to_string());
        }
        if let Some(v) = settings.get("impressVersion").and_then(|v| v.as_str()) {
            let app_state = app_handle.state::<AppState>();
            *app_state.impress_version.lock().unwrap() = v.to_string();
        }
    }

    Ok(())
}
