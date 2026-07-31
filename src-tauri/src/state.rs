use crate::commands::media_server::MediaServerHandle;
use crate::commands::projector_server::ProjectorServerHandle;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub bounds: WindowBounds,
    pub is_maximized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowStates {
    pub controller: Option<WindowState>,
    pub projector: Option<WindowState>,
}

pub struct AppState {
    pub window_states: Mutex<WindowStates>,
    pub default_path: Mutex<Option<String>>,
    pub impress_version: Mutex<String>,
    pub media_server: Mutex<Option<MediaServerHandle>>,
    pub projector_server: Mutex<Option<ProjectorServerHandle>>,
    pub debug_mode: bool,
}

impl Default for WindowStates {
    fn default() -> Self {
        Self {
            controller: Some(WindowState {
                bounds: WindowBounds {
                    x: 0,
                    y: 0,
                    width: 1200,
                    height: 800,
                },
                is_maximized: false,
            }),
            projector: Some(WindowState {
                bounds: WindowBounds {
                    x: 100,
                    y: 100,
                    width: 1920,
                    height: 1080,
                },
                is_maximized: false,
            }),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            window_states: Mutex::new(WindowStates::default()),
            default_path: Mutex::new(None),
            impress_version: Mutex::new("2.0.0".to_string()),
            media_server: Mutex::new(None),
            projector_server: Mutex::new(None),
            debug_mode: false,
        }
    }
}
