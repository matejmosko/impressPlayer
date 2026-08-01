use crate::state::AppState;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn quit_app(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    *state.media_server.lock().map_err(|e| e.to_string())? = None;
    *state.projector_server.lock().map_err(|e| e.to_string())? = None;
    for (_, window) in app.webview_windows() {
        let _ = window.destroy();
    }
    app.exit(0);
    Ok(())
}
