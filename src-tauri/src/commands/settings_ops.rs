use crate::state::{AppState, WindowBounds, WindowState};
use serde_json::{json, Value};
use std::fs;
use tauri::State;

#[tauri::command]
pub fn update_window_state(
    state: State<'_, AppState>,
    window_label: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    is_maximized: bool,
) -> Result<(), String> {
    let ws = WindowState {
        bounds: WindowBounds { x, y, width, height },
        is_maximized,
    };
    let mut states = state.window_states.lock().map_err(|e| e.to_string())?;
    match window_label.as_str() {
        "controller" => states.controller = Some(ws),
        "projector" => states.projector = Some(ws),
        _ => {}
    }
    drop(states);
    let _ = save_settings_inner(&state);
    Ok(())
}

#[tauri::command]
pub fn get_window_state(state: State<'_, AppState>, window_label: String) -> Result<Value, String> {
    let states = state.window_states.lock().map_err(|e| e.to_string())?;
    match window_label.as_str() {
        "controller" => Ok(serde_json::to_value(&states.controller).unwrap_or(json!(null))),
        "projector" => Ok(serde_json::to_value(&states.projector).unwrap_or(json!(null))),
        _ => Ok(json!(null)),
    }
}

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>) -> Result<(), String> {
    save_settings_inner(&state)
}

fn save_settings_inner(state: &State<'_, AppState>) -> Result<(), String> {
    let window_states = state.window_states.lock().unwrap().clone();
    let default_path = state.default_path.lock().unwrap().clone();
    let impress_version = state.impress_version.lock().unwrap().clone();
    let autoplay_media = *state.autoplay_media.lock().unwrap();

    let settings = json!({
        "windowstate": window_states,
        "defaultPath": default_path,
        "impressVersion": impress_version,
        "autoplayMedia": autoplay_media
    });

    let config_dir = dirs::config_dir()
        .or_else(|| dirs::data_dir())
        .ok_or_else(|| "Cannot determine config directory".to_string())?;
    let settings_path = config_dir.join("impressPlayer").join("settings.json");

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    fs::write(
        &settings_path,
        serde_json::to_string_pretty(&settings).map_err(|e| format!("Serialize error: {}", e))?,
    )
    .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn load_settings(state: State<'_, AppState>) -> Result<Value, String> {
    let config_dir = dirs::config_dir()
        .or_else(|| dirs::data_dir())
        .ok_or_else(|| "Cannot determine config directory".to_string())?;
    let settings_path = config_dir.join("impressPlayer").join("settings.json");

    if settings_path.exists() {
        let data = fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        let settings: Value = serde_json::from_str(&data)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;

        if let Some(windowstate) = settings.get("windowstate") {
            if let Ok(ws) =
                serde_json::from_value::<crate::state::WindowStates>(windowstate.clone())
            {
                *state.window_states.lock().unwrap() = ws;
            }
        }
        if let Some(dp) = settings.get("defaultPath").and_then(|v| v.as_str()) {
            *state.default_path.lock().unwrap() = Some(dp.to_string());
        }
        if let Some(v) = settings.get("impressVersion").and_then(|v| v.as_str()) {
            *state.impress_version.lock().unwrap() = v.to_string();
        }
        if let Some(v) = settings.get("autoplayMedia").and_then(|v| v.as_bool()) {
            *state.autoplay_media.lock().unwrap() = v;
        }

        Ok(settings)
    } else {
        Ok(json!({}))
    }
}

#[tauri::command]
pub fn get_impress_version(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.impress_version.lock().unwrap().clone())
}

#[tauri::command]
pub fn set_impress_version(state: State<'_, AppState>, version: String) -> Result<(), String> {
    *state.impress_version.lock().unwrap() = version;
    Ok(())
}

#[tauri::command]
pub fn get_autoplay_media(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(*state.autoplay_media.lock().unwrap())
}

#[tauri::command]
pub fn set_autoplay_media(state: State<'_, AppState>, autoplay: bool) -> Result<(), String> {
    *state.autoplay_media.lock().unwrap() = autoplay;
    Ok(())
}
