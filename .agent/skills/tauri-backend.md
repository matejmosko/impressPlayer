# Tauri Backend Skill

## Scope
Rust backend in `src-tauri/`: commands, state, servers, IPC, window management.

## Key Files
- `src-tauri/src/main.rs` — binary entry, calls `lib.rs::run()`
- `src-tauri/src/lib.rs` — app setup: plugins, command registration, settings load, native menu
- `src-tauri/src/state.rs` — `AppState` (window states, default path, media/projector server handles)
- `src-tauri/src/commands/` — all command handlers:
  - `app_ops.rs` — `quit_app`
  - `fs_ops.rs` — file ops (read/write/exists/dir/copy/rename/remove)
  - `dialog_ops.rs` — `get_default_path`, `save_default_path`
  - `zip_ops.rs` — `extract_zip`
  - `settings_ops.rs` — settings persistence (window state, default path, impress version, autoplay media)
  - `presentation.rs` — path helpers (`get_app_path`, `get_user_data_path`, `get_presentation_dir`, `check_style_css`)
  - `media_server.rs` — `start_media_server`, `stop_media_server`, `serve_file_request` (Range support)
  - `projector_server.rs` — `start_projector_server`, `stop_projector_server`, `set_projector_page`, `update_projection_state` (LAN HTTP server, 0.0.0.0, rev-based reload)

## Conventions
- All commands return `Result<T, String>` (error as String)
- State accessed via `State<'_, AppState>` with `.lock().map_err(|e| e.to_string())?`
- Servers use `Drop` impl for cleanup on app exit
- `serve_file_request` shared between media_server and projector_server
- Settings persisted to `config_dir()/impressPlayer/settings.json`

## Commands
```bash
cargo check                    # fast type-check
cargo test --manifest-path src-tauri/Cargo.toml  # run Rust tests (21 tests)
```

## Gotchas
- `resource_dir()` in dev mode doesn't point to `src/` — use `?raw` imports for bundling
- `withGlobalTauri: true` in `tauri.conf.json` — frontend uses `window.__TAURI__` globals
- Media server binds `127.0.0.1`, projector server binds `0.0.0.0`
- Port reused across presentation loads for projector server