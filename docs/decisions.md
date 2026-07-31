# Architecture Decisions & Findings

Record of decisions, workarounds, and findings during the Electron → Tauri v2 migration.

---

## 2025-07-27 — Tauri v2 over Flutter

**Decision:** Use Tauri v2 instead of Flutter for the desktop app rewrite.

**Reasoning:**
- Flutter would require wrapping impress.js in a WebView anyway, defeating the purpose of native rendering.
- Tauri gives the same DOM capabilities with smaller binaries (~5-10 MB vs ~150 MB Electron).
- Rust backend is more power-efficient than Electron's Node.js.
- Tauri v2 supports multi-window natively, which we need for controller + projector.

---

## 2025-07-27 — `window.__TAURI__` globals over npm imports

**Decision:** Use `window.__TAURI__` global objects instead of importing from `@tauri-apps/api`.

**Reasoning:**
- Vite 8 (Rolldown) cannot resolve internal module structure of `@tauri-apps/api` (e.g. `./event.js`, `./core.js`, `./dpi.js`).
- Setting `withGlobalTauri: true` in `tauri.conf.json` exposes the API on the window object.
- This is a pragmatic workaround that avoids fighting the build tool.

**Files affected:** All `src/*.js` files use `window.__TAURI__.core`, `window.__TAURI__.event`, etc.

---

## 2025-07-27 — Static HTML over Mustache template rendering

**Decision:** Replace the Electron `js/inv.js` Mustache template rendering pipeline with static HTML files.

**Reasoning:**
- Electron's `inv.js` reads `.tpl` templates, renders with Mustache, writes to `userData`, then loads them in webviews.
- Tauri doesn't need this intermediate step — HTML files in `src/` are served directly by Vite dev server or bundled for production.
- The presentation content is still built dynamically (markdown parsing, HTML extraction) but loaded via blob URLs instead of file rewrites.

---

## 2025-07-27 — Blob URLs for viewer content

**Decision:** Render presentations as blob URLs (inline impress.js + CSS + content) instead of loading from file paths.

**Reasoning:**
- Blob URLs are self-contained HTML documents that don't reference external files.
- This avoids CSP issues with `file://` protocol and cross-origin restrictions.
- The trade-off is larger in-memory HTML strings, but presentations are typically small.
- The `viewer-html-builder.js` builds the complete HTML document with all resources inlined.

**Key finding:** The `resource_dir()` API in Tauri v2 dev mode does NOT point to the `frontendDist` directory. It points to the bundle resource path, which may not contain files we placed in `src/`. This is why runtime file reads for impress.js failed silently.

---

## 2025-07-27 — Vite `?raw` imports for bundling impress.js

**Decision:** Use Vite's `?raw` import suffix to inline impress.js and CSS at build time.

**Reasoning:**
- Initial approach: Read impress.js at runtime via `invoke('read_file')` from `resource_dir()`.
- Problem: `resource_dir()` in dev mode doesn't point where expected. The `read_file` call failed silently, returning `'// impress.js not found'`.
- Solution: Import all 3 versions at build time using `import source from './file.js?raw'`. This bundles the file contents as strings in the JS bundle.
- Trade-off: The `viewer-html-builder.js` chunk is ~511 KB (was ~5 KB) because it contains all 3 impress.js versions. Acceptable for a desktop app.

**Files affected:** `src/shared/viewer-html-builder.js`

---

## 2025-07-27 — CSP must allow `blob:` for iframes

**Decision:** Add `blob:` to `frame-src` in the Content Security Policy.

**Reasoning:**
- Presentations are loaded into iframes via blob URLs.
- Default CSP `frame-src 'self'` blocks blob URLs.
- Updated to `frame-src 'self' blob: asset:` to allow both local and blob iframe sources.
- Also added `data:` to `img-src` and `font-src` for inline data URIs.

**File affected:** `src-tauri/tauri.conf.json`

---

## 2025-07-27 — impress.js version selection (1.0.0 / 1.1.0 / 2.0.0)

**Decision:** Bundle 3 versions of impress.js and let users choose at runtime.

**Reasoning:**
- Existing presentations may rely on specific impress.js behavior.
- v1.0.0 (2018): Plugin architecture, markdown support.
- v1.1.0 (2020): Media plugin, relative positioning improvements.
- v2.0.0 (2022): Default 1920×1080 resolution, relative rotations.
- Version preference is persisted in `settings.json` under `impressVersion`.
- Default is `2.0.0` (latest).

**Key finding:** The v2.0.0 release header file says `version: 1.1.0` — the version string in the file header is auto-generated and doesn't match the release tag. The actual differences are in the code.

**Files affected:**
- `src/js/impressjs/impress-v{1.0.0,1.1.0,2.0.0}.js` — the 3 bundled versions
- `src/shared/viewer-html-builder.js` — selects version at build time via `?raw` imports
- `src-tauri/src/state.rs` — `impress_version` field in `AppState`
- `src-tauri/src/commands/settings_ops.rs` — `get_impress_version` / `set_impress_version` commands
- `src/controller.html` — version `<select>` dropdown in header
- `src/controller-script.js` — wires dropdown change to `set_impress_version` + reloads presentation

---

## 2025-07-27 — postMessage for iframe ↔ parent communication

**Decision:** Use `window.postMessage()` / `window.addEventListener('message')` for communication between viewer iframe and controller/projector.

**Reasoning:**
- Electron uses `ipc.sendToHost()` from webview to renderer, which has no Tauri equivalent.
- `postMessage` is the standard web API for cross-origin iframe communication.
- The blob URL creates a separate origin, but `postMessage` still works with `'*'` target origin.
- Message format: `{ command: 'nextSlide' }` going down, `{ event: 'stepList', payload: {...} }` going up.

---

## 2025-07-27 — i18n via build-time JSON imports

**Decision:** Import locale JSON files at build time instead of reading them at runtime.

**Reasoning:**
- Same pattern as impress.js — avoid runtime file reads via Tauri IPC.
- `src/shared/i18n.js` imports `en.json` and `sk.json` directly.
- Locale detection uses `navigator.language` (sk → Slovak, everything else → English).
- `data-i18n` HTML attributes mark elements for automatic translation via `applyTranslations()`.

**Files affected:**
- `src/shared/i18n.js`
- `src/locales/en.json`, `src/locales/sk.json`

---

## 2025-07-27 — No webview tags in Tauri

**Finding:** Tauri does not support Electron's `<webview>` tag. All embedded content must use:
- `<iframe>` for same-origin or blob URL content.
- `WebviewWindow` (Tauri's multi-window API) for separate OS windows.

**Impact:** The projector window is a separate `WebviewWindow`, not a `<webview>` tag inside the controller. The controller's main viewer uses a standard `<iframe>`.

---

## 2025-07-27 — Thumbnail iframes with `#thumbnail` hash mode

**Decision:** Use the same blob URL in multiple iframes for thumbnails, with `#thumbnail` hash to disable interactivity.

**Reasoning:**
- The controller needs: 2 sidebar thumbnails (next slides) + overview grid (all slides as thumbnails).
- Same blob URL can be loaded in multiple iframes — each runs its own impress.js instance.
- Appending `#thumbnail` to the blob URL lets the viewer script detect thumbnail mode.
- In thumbnail mode: skip event reporting (no `stepList`/`gotoSlide` back to parent), skip media listeners, respond only to `gotoSlide` commands.
- Non-interactive overlay via `.impressCurtain` CSS + `pointer-events: none` on iframes.
- `data-slide` attribute tracks which slide each iframe is showing to avoid redundant commands.
- Overview thumbnails loaded sequentially via `loadOverviewThumb()` chain to avoid thrashing.

**Trade-offs:**
- Each iframe runs full impress.js (~50 KB parsed). A 50-slide presentation creates ~52 iframes (2 sidebar + 50 overview). This is heavier than Electron's `<webview>` (separate process isolation) but acceptable for typical presentations.
- If performance becomes an issue, can limit overview thumbnails or use static screenshot captures.

**Files affected:**
- `src/shared/viewer-html-builder.js` — `#thumbnail` mode check
- `src/controller.html` — sidebar iframe containers, overview grid container
- `src/controller-script.js` — `sendToThumbnail()`, `updateSidebarThumbnails()`, `updateOverviewThumbnails()`, `loadOverviewThumb()` chain
- `src/css/styles-controller.css` — `.nextSlideInner`, `.thumbnailFrame`, `.slideLabel`, `.overview-thumb-wrapper`, `.overview-thumb-frame`, `.overview-thumb-label`

---

## 2025-07-31 — Thumbnail ids must match impress.js runtime assignment

**Decision:** `generateSlideThumbnails()` assigns `step-{index+1}` to steps that lack an `id`, mirroring impress.js exactly.

**Reasoning:**
- Markdown wrapping only gives the first slide an explicit `id` (`step-slide-1`); slides 2+ have no id in the raw content.
- impress.js assigns `el.id = "step-" + (idx + 1)` to id-less steps at `init()` time (same scheme in all 3 bundled versions).
- The controller keys thumbnails by the viewer's `stepList` ids (post-impress), so thumbnails generated from pre-impress content must produce the identical ids — otherwise `slideThumbnails[id]` is missing and the sidebar shows "Loading...".
- Index is over **all** `.step` elements in DOM order (not only the id-less ones) in both impress.js and the generator.

**Files affected:** `src/shared/viewer-html-builder.js`, `tests/test-frontend.js` (regression test)

---

## 2025-07-31 — Browser-accessible projector via a LAN HTTP server

**Decision:** Serve the projector to browsers (e.g. a projector machine on the LAN) from a dedicated HTTP server (`projector_server.rs`) that binds `0.0.0.0` and serves the presentation page with sound enabled.

**Reasoning:**
- True pixel/window streaming is not available in Tauri v2/wry (no screenshot/capture API), so the browser must render its own HTML.
- The controller already builds the full self-contained viewer HTML (`getViewerHtml`) and knows the master media state — both are pushed to the server.
- The server reuses the media server's Range-enabled file serving (`serve_file_request`) for `/media/*`, so remote video/audio playback works while the media server stays `127.0.0.1`-only.
- State sync is one-way (controller → server → browser) via a `/state` JSON endpoint polled every 250 ms; the browser page is display-only.
- Port is reused across presentation loads; `set_projector_page` swaps the page + serve dir and bumps `rev`; the rev is injected into the served page (`/*__PROJECTOR_REV__*/`), so browsers auto-reload when the presentation changes.
- LAN IP is derived from the default route via a UDP `connect()` (no packets sent), with a `127.0.0.1` fallback.

**Security trade-off:** No auth — anyone on the LAN can view the presentation and its files. URL is shown in the controller footer (`#projectorUrlLabel`). The server stops on app exit (handle `Drop`).

**Files affected:**
- `src-tauri/src/commands/projector_server.rs` — new server + commands
- `src-tauri/src/commands/media_server.rs` — extracted `serve_file_request` / `mime_for` / `url_decode`
- `src-tauri/src/state.rs`, `lib.rs`, `commands/mod.rs` — registration
- `src/shared/viewer-html-builder.js` — `rewriteAssetsToServer()`, `isBrowser` viewer mode
- `src/controller-script.js` — server start/page push/state push, footer URL label
- `src/controller.html`, `src/css/styles-controller.css` — `#projectorUrlLabel`
- `tests/run_tests.sh`, `tests/test-frontend.js`, `src-tauri` tests — coverage

---

## Open Questions

### Phase 4 — New features
- Dynamic slide editing requires a contenteditable layer or a separate editor UI.
- Web/iframe slides need a sandboxed iframe with restricted permissions.
- Window mirroring requires OS-level screen capture APIs (Tauri has plugins for this).
