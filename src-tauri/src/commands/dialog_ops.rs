use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_default_path(state: State<'_, AppState>) -> Result<Option<String>, String> {
    Ok(state.default_path.lock().unwrap().clone())
}

#[tauri::command]
pub fn save_default_path(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let mut dp = state.default_path.lock().unwrap();
    *dp = Some(path);
    Ok(())
}
