# AGENTS.md

## Project

Impress.js presentation viewer. Supports `.md`, `.html`, and `.zip` (markpress) inputs. Built on Tauri v2 (migration from Electron complete).

## Architecture

### Tauri (new — `src-tauri/`)
- **`src-tauri/src/main.rs`** — Binary entry, calls `lib.rs::run()`.
- **`src-tauri/src/lib.rs`** — App setup: plugins, command registration, settings load, native menu bar.
- **`src-tauri/src/state.rs`** — `AppState` (window states, default path, media server handle, projector server handle). `WindowStates` is `Serialize/Deserialize` for settings persistence.
- **`src-tauri/src/commands/`** — Tauri command handlers:
  - `fs_ops.rs` — `read_file`, `read_file_base64`, `write_file`, `file_exists`, `read_dir`, `create_dir`, `remove_file`, `remove_dir`, `rename_file`, `copy_file`
  - `dialog_ops.rs` — `get_default_path`, `save_default_path`
  - `zip_ops.rs` — `extract_zip` (Rust `zip` crate)
  - `settings_ops.rs` — `save_settings`, `load_settings`, `update_window_state`, `get_window_state`, `get_impress_version`, `set_impress_version`
  - `presentation.rs` — `get_app_path`, `get_user_data_path`, `get_presentation_dir`, `check_style_css`
  - `media_server.rs` — `start_media_server`, `stop_media_server`. Lightweight HTTP file server with Range request support for video/audio playback (asset:// protocol doesn't support Range on WebKit2GTK). Exports `serve_file_request` (shared by the projector server).
  - `projector_server.rs` — `start_projector_server`, `stop_projector_server`, `set_projector_page`, `update_projection_state`. LAN-accessible HTTP server (binds `0.0.0.0`) that serves the projector page to browsers: `/` page (with rev injected), `/state` JSON (slide + media time/playing), `/media/*` files from the presentation dir (Range support). Reuses the same port across loads; `set_projector_page` swaps page + serve dir and increments `rev` (browser reloads on rev change).
- **`src-tauri/capabilities/default.json`** — Scoped permissions for fs, dialog, store, window, webview, event.
- **`src-tauri/tauri.conf.json`** — Window definitions, CSP, bundle config.

### Frontend (`src/`)
- **`src/controller.html`** — Controller UI with CSS from `css/styles-controller.css`. Uses `data-i18n` attributes for localization. Contains sidebar iframe containers for 2 next-slide thumbnails and overview grid for slides list.
- **`src/projector.html`** — Projector display with CSS from `css/styles-projector.css`.
- **`src/viewer.html`** — Default viewer placeholder shown when no presentation is loaded.
- **`src/controller-script.js`** — Controller logic: native file dialog, slide navigation, keyboard controls, projector window management, media controls, exit dialog, timer, static sidebar/overview thumbnails via blob URLs, bidirectional slide sync with projector, projector server management (`start_projector_server`, `set_projector_page`, `update_projection_state` pushes).
- **`src/projector-script.js`** — Projector logic: loads presentations from controller (`#projector` viewer mode: muted media, follows `mediaSync`), keyboard nav, fullscreen toggle, reports slide changes back to controller.
- **`src/shared/viewer-html-builder.js`** — Builds self-contained viewer HTML blob with inlined impress.js, normalize CSS, and viewer script. Handles postMessage communication between parent and iframe. Exports `generateSlideThumbnails()` for static per-slide thumbnail HTML and `rewriteAssetsToServer()` for browser-projector URLs. Viewer modes: `#thumbnail`, `#projector` (muted follower), `isBrowser` (top-level page served by the projector server — sound-on follower driven by `/state` polling).
- **`src/shared/presentation-utils.js`** — Markdown wrapping (via `markdown-it`) and HTML extraction.
- **`src/shared/i18n.js`** — i18n module using `locales/en.json` and `locales/sk.json`. Detects locale from `navigator.language`, provides `__()` for translations, `applyTranslations()` for DOM.
- **`src/locales/`** — i18n JSON files (`en.json`, `sk.json`).
- **`src/css/`** — Controller and projector CSS, FontAwesome, fonts (Exo, Dosis, Nasalization).
- **`src/js/impressjs/`** — Bundled impress.js library:
  - `impress-v1.0.0.js` — Original plugin architecture (2018)
  - `impress-v1.1.0.js` — Media plugin, relative positioning (2020)
  - `impress-v2.0.0.js` — Latest: 1920×1080 default, relative rotations (2022, default)

## Commands

### Tauri (primary)
```
npx tauri dev             # Run in dev mode with hot-reload (Vite + Cargo)
cargo tauri build         # Build release binary
cargo check               # Type-check Rust code (fast)
npm run build:frontend    # Build frontend only (Vite → dist-frontend/)
npm test                  # Legacy frontend test suite (tests/run_tests.sh)
```

## Setup Gotchas

- **Tauri system deps (Linux):** `sudo apt-get install -y libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libappindicator3-dev libgtk-3-dev`
- **No linter, no typecheck.** `.jshintrc` and `.csslintrc` exist but have no runners.
- **Vite 8/Rolldown:** Cannot resolve `@tauri-apps/api` internal modules. Use `window.__TAURI__` globals with `withGlobalTauri: true` instead.
- **Blob URLs for viewer:** Presentations are rendered as blob URLs (inline impress.js + CSS + content) because blob URLs cannot reference external files. The `viewer-html-builder.js` caches impress.js and normalize CSS on first load.
- **`vite.config.mjs` outputs to `dist-frontend/`** (gitignored) but `tauri.conf.json` uses `frontendDist: "../src"`, so the source files are served directly.

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
| `start_projector_server` / `stop_projector_server` | FE → Rust | Start/stop LAN HTTP server serving the browser projector page |
| `set_projector_page` | FE → Rust | Set browser projector page HTML + serve dir (bumps `rev`, browsers reload) |
| `update_projection_state` | FE → Rust | Push slide + media `{time, playing}` to the projector server `/state` |
| `get_app_path` | FE → Rust | Get resource directory path |
| `get_user_data_path` | FE → Rust | Get app data directory path |
| `get_presentation_dir` | FE → Rust | Get directory of presentation file |
| `check_style_css` | FE → Rust | Check if style.css exists in dir |

### Frontend Event Map

| Event | Direction | Purpose |
|---|---|---|
| `loadProjection` | Controller → Projector | Load/reload presentation (with current slide) |
| `projector-ready` | Projector → Controller | Projector window is ready |
| `nextSlide` / `prevSlide` | Controller → Viewer iframe | Navigate slides |
| `gotoSlide` | Controller → Viewer iframe | Go to specific slide |
| `setupEventHandlers` | Controller → Viewer iframe | Initialize media event listeners |
| `audioVideoControls` | Controller → Viewer iframe | Play/pause/seek media (master viewer only) |
| `mediaSync` | Viewer iframe → Controller | Master media state `{time, playing}` (on timeupdate, play/pause/seeked/ended, 1s heartbeat) |
| `mediaSync` | Controller → Projector | Forward master media state for follower sync |
| `gotoSlide` | Controller → Projector | Sync slide change to projector |
| `controller-slide-changed` | Projector → Controller | Sync slide change back to controller |
| `menu-event` | Rust → Controller | Native menu item clicked (menu-load, menu-refresh, menu-devtools) |

## Presentation Loading Flow

1. User clicks Open → `selectFile()` opens native dialog
2. File read via `invoke('read_file')` → content parsed (markdown wrapped, HTML extracted, zip extracted)
3. Media server started via `invoke('start_media_server')` for the presentation directory
4. `rewriteMediaToHttp()` rewrites `<video|audio|source>` src to `http://127.0.0.1:{port}/...`
5. `getViewerHtml()` builds self-contained HTML: inlines impress.js, normalize CSS, presentation content, viewer script
6. Blob URL created → loaded into controller's iframe
7. `emit('loadProjection', { file, slide })` sent to projector → projector builds the same blob HTML and navigates to the controller's current slide
8. Viewer iframe runs `impress().init()` → reports step list via `postMessage`
9. Controller builds static per-slide thumbnails from `generateSlideThumbnails()` and renders them into blob-URL iframes (sidebar + overview grid)
10. On slide change, the controller updates sidebar thumbnails to show next-slide context

## Browser Projector (LAN HTTP)

The projector can also be shown in a **browser** (e.g. a projector machine on the LAN), with **sound enabled**.

- `start_projector_server(dir)` binds `0.0.0.0:<random port>` (port is **reused** across presentation loads); returns the LAN URL shown in the controller footer (`#projectorUrlLabel`).
- On each presentation load the controller builds a second viewer page: content + style URLs rewritten with `rewriteAssetsToServer()` → `http://<lan-ip>:<port>/media/<path>` (relative src/href/poster/url() only; absolute http(s)/data/blob/asset/file/root-relative untouched), `getViewerHtml(..., baseDir=null)` (no `asset://` rewrite), then `set_projector_page(html, dir)`.
- The controller pushes slide changes (`renderNextSlide`) and `mediaSync {time, playing}` (viewer→controller) to the server via `update_projection_state`.
- The browser page runs in `isBrowser` mode (top-level document, `window.parent === window`): **sound on**, no auto-play on step-enter, ignores `audioVideoControls`, polls `/state` every 250 ms → `impress().goto(slide)` + `applyMediaSync(media)`.
- Page swap: `set_projector_page` increments `rev`; the server injects the current rev into the served page (`/*__PROJECTOR_REV__*/` placeholder); browsers reload when `/state.rev` no longer matches.
- `/media/*` serves files from the presentation dir with Range support (via `media_server::serve_file_request`), so video/audio works remotely while the media server stays `127.0.0.1`-only.
- **Security note:** no auth — anyone on the LAN can view the presentation. URL shown in controller footer; server stops on app exit (handle `Drop`).

## Thumbnail Architecture

- Thumbnails are **static HTML documents** generated by `generateSlideThumbnails()` (content + normalize CSS inline, no impress.js, no event listeners)
- **CSS ordering matters:** base `html,body{...}` styles must be inlined **before** `styleContent`, and the `.step` fit override **after** it — a trailing `html,body{background:#fff}` (the old bug) silently overrides the presentation's `body { background: url(...) }` and kills thumbnail background images. The main viewer is safe because its `background:#fff` lives in the first `<style>` block
- **Id assignment:** steps without an `id` get `step-{index+1}` (index among all `.step` in DOM order) — **must match** impress.js's runtime id assignment (`el.id = "step-" + (idx + 1)` in all bundled versions), or the thumbnail keys won't match the viewer's `stepList` ids and the sidebar shows "Loading..."
- Rendered via **blob URLs** (`iframe.src = URL.createObjectURL(...)`, same mechanism as the main viewer) — loaded once per slide and cached in `thumbnailBlobUrls`; cleared on presentation reload. No `srcdoc`, no load→`gotoSlide` async lifecycle, no media playback
- `sendToThumbnail(iframeId, slideId)` points the iframe at the cached thumbnail blob URL from the `slideThumbnails` dict; a "Loading..." placeholder blob is used when a slide's HTML isn't ready
- Sidebar: 2 preview cards above an `.editButtonsArea` placeholder; Presentation mode shows next 2 slides, Slides List mode shows current + next slide
- Overview thumbnails loaded eagerly via `loadOverviewThumb()` chain (sequential, all slides)
- Thumbnails are non-interactive (`.impressCurtain` overlay + `pointer-events: none`)
- Slide sync is bidirectional: controller emits `gotoSlide`, projector reports back `controller-slide-changed` (guarded against redundant updates)
