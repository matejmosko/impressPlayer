# AGENTS.md

## Project

Impress.js presentation viewer. Supports `.md`, `.html`, and `.zip` (markpress) inputs. Being migrated from Electron to Tauri v2.

## Architecture

### Tauri (new — `src-tauri/`)
- **`src-tauri/src/main.rs`** — Binary entry, calls `lib.rs::run()`.
- **`src-tauri/src/lib.rs`** — App setup: plugins, command registration, settings load, native menu bar.
- **`src-tauri/src/state.rs`** — `AppState` (window states, default path, media server handle). `WindowStates` is `Serialize/Deserialize` for settings persistence.
- **`src-tauri/src/commands/`** — Tauri command handlers:
  - `fs_ops.rs` — `read_file`, `read_file_base64`, `write_file`, `file_exists`, `read_dir`, `create_dir`, `remove_file`, `remove_dir`, `rename_file`, `copy_file`
  - `dialog_ops.rs` — `get_default_path`, `save_default_path`
  - `zip_ops.rs` — `extract_zip` (Rust `zip` crate)
  - `settings_ops.rs` — `save_settings`, `load_settings`, `update_window_state`, `get_window_state`, `get_impress_version`, `set_impress_version`
  - `presentation.rs` — `get_app_path`, `get_user_data_path`, `get_presentation_dir`, `check_style_css`
  - `media_server.rs` — `start_media_server`, `stop_media_server`. Lightweight HTTP file server with Range request support for video/audio playback (asset:// protocol doesn't support Range on WebKit2GTK).
- **`src-tauri/capabilities/default.json`** — Scoped permissions for fs, dialog, store, window, webview, event.
- **`src-tauri/tauri.conf.json`** — Window definitions, CSP, bundle config.

### Frontend (`src/`)
- **`src/controller.html`** — Controller UI with CSS from `css/styles-controller.css`. Uses `data-i18n` attributes for localization. Contains sidebar iframe containers for 2 next-slide thumbnails and overview grid for slides list.
- **`src/projector.html`** — Projector display with CSS from `css/styles-projector.css`.
- **`src/viewer.html`** — Default viewer placeholder shown when no presentation is loaded.
- **`src/controller-script.js`** — Controller logic: native file dialog, slide navigation, keyboard controls, projector window management, media controls, exit dialog, timer, thumbnail iframe lifecycle.
- **`src/projector-script.js`** — Projector logic: loads presentations from controller, keyboard nav, fullscreen toggle.
- **`src/shared/viewer-html-builder.js`** — Builds self-contained viewer HTML blob with inlined impress.js, normalize CSS, and viewer script. Handles postMessage communication between parent and iframe. Supports `#thumbnail` mode for non-interactive thumbnails.
- **`src/shared/i18n.js`** — i18n module using `locales/en.json` and `locales/sk.json`. Detects locale from `navigator.language`, provides `__()` for translations, `applyTranslations()` for DOM.
- **`src/locales/`** — i18n JSON files (`en.json`, `sk.json`).
- **`src/css/`** — Controller and projector CSS, fonts (Exo, Dosis, Nasalization).
- **`src/js/impressjs/`** — Bundled impress.js library:
  - `impress-v1.0.0.js` — Original plugin architecture (2018)
  - `impress-v1.1.0.js` — Media plugin, relative positioning (2020)
  - `impress-v2.0.0.js` — Latest: 1920×1080 default, relative rotations (2022, default)

### Legacy Electron (root — still functional)
- **`main.js`** — Electron main process. Creates 3 windows: inv, controller, projector.
- **`js/inv.js`** — Bootstrap renderer. Reads `.tpl` templates, renders with Mustache, writes to `userData`.
- **`templates/*.tpl`** — Mustache templates for controller, projector, viewer.
- **`js/controller-script.js`**, **`js/projector-script.js`**, **`js/viewer-script.js`** — Electron renderer scripts.
- **`js/impressjs/`** — Bundled impress.js library.
- **`locales/`** — i18n JSON files (`en.json`, `sk.json`).

## Commands

### Tauri (primary)
```
npx tauri dev             # Run in dev mode with hot-reload (Vite + Cargo)
cargo tauri build         # Build release binary
cargo check               # Type-check Rust code (fast)
npx vite build --config vite.config.mjs  # Build frontend only
```

### Electron (legacy)
```
npm start                # Run the app (electron . --disable-gpu-sandbox)
npm run debug            # Run with inspector on port 5858
```

### Build tooling
```
npm run pack             # Build unpacked directory (electron-builder)
npm run dist             # Build distributable (electron-builder)
```

## Setup Gotchas

- **Tauri system deps (Linux):** `sudo apt-get install -y libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libappindicator3-dev libgtk-3-dev`
- **`.npmrc` is stale:** Sets `target = 1.7.6` but package.json has electron ^25.1.0. Only relevant for legacy Electron path.
- **No test suite, no linter, no typecheck.** `.jshintrc` and `.csslintrc` exist but have no runners.
- **Generated files:** `viewer.html`, `controller.html`, `projector.html` in root are generated at runtime by Electron (gitignored). The Tauri frontend files in `src/` are static.
- **Vite 8/Rolldown:** Cannot resolve `@tauri-apps/api` internal modules. Use `window.__TAURI__` globals with `withGlobalTauri: true` instead.
- **Blob URLs for viewer:** Presentations are rendered as blob URLs (inline impress.js + CSS + content) because blob URLs cannot reference external files. The `viewer-html-builder.js` caches impress.js and normalize CSS on first load.

## IPC Command Map (Tauri)

Frontend calls Rust via `invoke('command_name', { args })`. Key channels:

| Command | Direction | Purpose |
|---|---|---|
| `read_file` | FE → Rust | Read file contents |
| `read_file_base64` | FE → Rust | Read binary file as base64 |
| `write_file` | FE → Rust | Write file contents |
| `extract_zip` | FE → Rust | Extract .zip to directory |
| `save_settings` / `load_settings` | FE → Rust | Persist window state, default path |
| `update_window_state` / `get_window_state` | FE → Rust | Save/restore window bounds per label |
| `get_impress_version` / `set_impress_version` | FE → Rust | Get/set impress.js version preference |
| `start_media_server` / `stop_media_server` | FE → Rust | Start/stop local HTTP file server for media |
| `get_app_path` | FE → Rust | Get resource directory path |
| `get_user_data_path` | FE → Rust | Get app data directory path |
| `get_presentation_dir` | FE → Rust | Get directory of presentation file |
| `check_style_css` | FE → Rust | Check if style.css exists in dir |

### Frontend Event Map

| Event | Direction | Purpose |
|---|---|---|
| `loadFile` | Controller → Projector | Tell projector to load a file |
| `loadProjection` | Controller → Projector | Tell projector to reload presentation |
| `projector-ready` | Projector → Controller | Projector window is ready |
| `nextSlide` / `prevSlide` | Controller → Viewer iframe | Navigate slides |
| `gotoSlide` | Controller → Viewer iframe | Go to specific slide |
| `setupEventHandlers` | Controller → Viewer iframe | Initialize media event listeners |
| `audioVideoControls` | Controller → Viewer iframe | Play/pause/seek media |
| `gotoSlide` | Viewer iframe → Controller | Report current slide |
| `stepList` | Viewer iframe → Controller | Report slide list |
| `multimedia` | Viewer iframe → Controller | Media visibility on/off |
| `audioVideoPlaying` | Viewer iframe → Controller | Media play state |
| `mediaTime` | Viewer iframe → Controller | Media seek position |
| `controlsEnabled` | Viewer iframe → Controller | Slide transition state |
| `menu-event` | Rust → Controller | Native menu item clicked (menu-load, menu-refresh, menu-devtools) |

## Presentation Loading Flow

1. User clicks Open → `selectFile()` opens native dialog
2. File read via `invoke('read_file')` → content parsed (markdown wrapped, HTML extracted, zip extracted)
3. Media server started via `invoke('start_media_server')` for the presentation directory
4. `rewriteMediaToHttp()` rewrites `<video|audio|source>` src to `http://127.0.0.1:{port}/...`
5. `getViewerHtml()` builds self-contained HTML: inlines impress.js, normalize CSS, presentation content, viewer script
6. Blob URL created → loaded into controller's iframe
7. `emit('loadFile')` sent to projector → projector builds same blob HTML
8. Viewer iframe runs `impress().init()` → reports step list via `postMessage`
9. Controller creates thumbnail iframes (sidebar + overview grid) with `blobUrl#thumbnail`
10. Each thumbnail's impress.js initializes → controller sends `gotoSlide` to navigate each to its slide
11. On slide change, sidebar thumbnails update to show current slide context

## Thumbnail Architecture

- Same blob URL used across all iframes (main + thumbnails)
- Thumbnails append `#thumbnail` hash to blob URL
- Viewer script checks `window.location.hash === '#thumbnail'` to skip event reporting and media listeners
- Thumbnails are non-interactive (`.impressCurtain` overlay + `pointer-events: none`)
- `sendToThumbnail(iframeId, slideId)` manages load lifecycle: sets src, waits for load, sends `gotoSlide`
- Overview thumbnails loaded lazily via `loadOverviewThumb()` chain (sequential to avoid thrashing)
- `data-slide` attribute on iframes tracks current slide to avoid redundant `gotoSlide` commands
