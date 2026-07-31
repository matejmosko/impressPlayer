use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn get_app_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    Ok(app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Cannot get resource dir: {}", e))?
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub fn get_user_data_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    Ok(app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot get app data dir: {}", e))?
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub fn get_presentation_dir(file_path: String) -> Result<String, String> {
    Ok(PathBuf::from(&file_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default())
}

#[tauri::command]
pub fn check_style_css(file_path: String) -> Result<bool, String> {
    let style_path = PathBuf::from(&file_path).join("style.css");
    Ok(style_path.exists())
}
