Tauri v2 Migration Plan for ImpressPlayer
-----------------------------------------

## Architecture Overview
The migration replaces Electron's bundled Chromium + Node.js with Tauri's OS-native WebView + Rust backend. The biggest structural change: eliminating <webview> tags (unsupported in Tauri) and converting all remote module calls to Tauri commands.
┌─────────────────────────────────────────────────────┐
│                    Rust Backend                      │
│  main.rs — commands for fs, zip, dialog, settings   │
│  tauri-plugin-fs, tauri-plugin-store, zip crate      │
└──────────┬──────────────────────────┬───────────────┘
           │ invoke() / listen()      │ emit()
┌──────────▼──────────┐  ┌────────────▼───────────────┐
│   Controller Window │  │    Projector Window         │
│   (Tauri Webview)   │  │    (Tauri Webview)          │
│   HTML/CSS/JS       │  │    HTML/CSS/JS + impress.js │
│   Mustache, i18n    │  │    viewer-script.js         │
└─────────────────────┘  └────────────────────────────┘
## Phase 1: Scaffold & Core IPC
**Goal**: Tauri boots, creates controller + projector windows, basic IPC works.
### Task	Details
- cargo init + npm create tauri-app	Scaffold src-tauri/ alongside existing code
- Define tauri.conf.json windows	Controller (1200x800), Projector (1920x1080, hidden)
- Port main.js → src-tauri/src/main.rs	Window creation, menu, state persistence
- Implement Tauri commands	read_file, write_file, list_dir, extract_zip, show_dialog, save_settings, load_settings
- Register frontend listeners	Port ipcRenderer.on → listen() calls in JS
- Key files to create:
  - src-tauri/src/main.rs — app entry, command handlers
  - src-tauri/Cargo.toml — deps: tauri, zip, tauri-plugin-fs, tauri-plugin-store, tauri-plugin-dialog
  - src-tauri/capabilities/default.json — scoped fs permissions
Key files to port:
  - main.js → main.rs (window mgmt, IPC routing, menus)
  - js/inv.js → frontend inv.js (template rendering, now using invoke() instead of remote)

## Phase 2: Frontend Port
**Goal**: Controller and projector HTML render correctly using the same templates and CSS.
### Task	Details
- Replace remote calls in js/inv.js	fs.readFile → invoke('read_file'), etc.
- Replace remote calls in js/controller-script.js	dialog.showOpenDialog → invoke('show_open_dialog')
- Replace remote calls in js/projector-script.js	Minimal changes (settings access)
- Port js/viewer-script.js	Remove ipc.sendToHost → use emit() to parent window
- Keep mustache.js + i18n-2	Templates render identically, locale files unchanged
- Keep markdown-it	No Rust port needed initially
- What stays unchanged:
  - templates/*.tpl — rendered by mustache.js on frontend
  - css/* — all stylesheets
  - locales/* — JSON i18n files
  - js/impressjs/ — bundled impress.js library

## Phase 3: WebView → Window Architecture
**Goal**: Replace <webview> embedding with Tauri's multi-window model.

This is the hardest phase. Currently, viewer.html is embedded inside both controller and projector via <webview> tags with nodeintegration.
### Current Pattern	Tauri Replacement
- <webview src="viewer.html" nodeintegration> in controller.tpl	Separate "viewer-preview" window or iframe with asset:// URL
- <webview src="viewer.html" nodeintegration> in projector.tpl	Projector window loads viewer.html directly
- webview.send('gotoSlide', id)	WebviewWindow.getByLabel('projector').emit('gotoSlide', id)
- ipc.sendToHost() from viewer-script.js	emit('slide-changed', data) to parent window
- webview.reload()	Window-level reload via Tauri API
- Architecture decision:
- The projector window should load viewer.html directly (no iframe/webview needed). The controller window can show slide previews either via:
  - Option A (recommended): A second dedicated "preview" window (small, positioned next to controller)
  - Option B: <iframe> with asset://localhost/path/to/previewer.html (simpler but less control)

## Phase 4: New Features (Post-Migration)
**Goal**: Add dynamic slides and new slide types.
### Feature	Implementation
- Dynamic slides (images/video/audio)	Tauri command add_media → file dialog → copy to presentation dir → inject <div class="step"> into impress DOM
- Web slides (iframe)	New slide type with <div class="step"><iframe src="..."></div> — impress.js already supports this
- Window mirroring	Highest risk. Options: (1) tauri-plugin-screenshots for static capture, (2) WebRTC getDisplayMedia() in projector webview, (3) Rust-side xcap crate for streaming
- Sound management	Add audio control IPC channel, Rust-side audio mixing if needed
- Risk Register
- Risk	Severity	Mitigation
- <webview> no equivalent	High	Phase 3 rearchitecture — plan early
- Window mirroring has no Tauri API	High	Prototype with WebRTC getDisplayMedia() in Week 1
- Autoplay policy differs per OS	Medium	Muted-then-unmute pattern; test on all platforms
- remote module elimination	Medium	Straightforward but large surface area (~50 call sites)
- Template path resolution changes	Low	BaseDirectory.Resource replaces app.getAppPath()

## Proposed File Structure
impressplayer/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   └── src/
│       ├── main.rs              # Entry point, command registration
│       ├── commands/
│       │   ├── fs_ops.rs        # read_file, write_file, exists, etc.
│       │   ├── dialog_ops.rs    # show_open_dialog, show_save_dialog
│       │   ├── zip_ops.rs       # extract_zip
│       │   ├── settings_ops.rs  # save/load settings
│       │   └── presentation.rs  # parse_md, parse_html, load_presentation
│       └── state.rs             # AppState (settings, window state)
├── src/                         # Frontend (moved from root)
│   ├── index.html
│   ├── inv.js
│   ├── controller-script.js
│   ├── projector-script.js
│   ├── viewer-script.js
│   └── ...
├── templates/                   # Unchanged
├── css/                         # Unchanged
├── locales/                     # Unchanged
├── js/impressjs/               # Unchanged
└── package.json                 # Minimal — tauri CLI scripts

## Estimated Effort
Phase	Scope
Phase 1: Scaffold & Core IPC	Rust setup, commands, basic windows
Phase 2: Frontend Port	Port all JS to use Tauri APIs
Phase 3: WebView → Window	Rearchitect viewer embedding
Phase 4: New Features	Dynamic slides, web slides, mirroring
Total	 

## Recommended Start
1. Prototype Phase 3 first — verify the webview → window model works before committing to the full migration
2. Prototype window mirroring — confirm Tauri can do what you need before investing in the port
3. Then proceed with Phases 1 → 2 → 4 in order
