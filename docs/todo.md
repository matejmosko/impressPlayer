# TODO

Remaining work for the Electron → Tauri v2 migration and new features.

---

## Phase 3 — Multi-window Controller+Projector (complete)

- [x] Thumbnail iframes with `#thumbnail` hash mode
- [x] Sidebar shows all slides as thumbnail previews
- [x] Overview grid shows all slides as clickable thumbnails
- [x] `sendToThumbnail()` lifecycle management (lazy load, gotoSlide)
- [x] `loadOverviewThumb()` sequential chain to avoid thrashing
- [x] Media resolution via local HTTP server with Range request support
- [x] Markdown parser: `markdown-it` with images, links, lists, `<hr>`, raw HTML
- [x] Overview grid preserves thumbnails on slide change
- [x] Viewer sends stepList once at init, not on every slide
- [x] Exit dialog uses `destroy()` to avoid close-loop
- [x] Keyboard control toggle during transitions
- [x] Projector hide-on-close
- [x] Audio muting on thumbnails
- [x] Button state sync for projector/fullscreen
- [x] Extract shared presentation-utils.js, viewer-html-builder.js, i18n.js
- [x] Test suite (Rust + Node.js + build/validation)
- [x] Video playback via local HTTP media server (asset:// doesn't support Range requests on WebKit2GTK)

---

## Phase 4 — New Features (in progress)

### Completed
- [x] **Refresh presentation** — Reload from disk without re-selecting file (F5 shortcut + refresh button)
- [x] **Window state persistence** — Save/restore controller window bounds + maximized state
- [x] **Application menu** — Native menu bar: File > Load (Ctrl+O), Refresh (F5), Toggle DevTools (Ctrl+Shift+I)
- [x] **Web/iFrame slides** — Support `data-url` attribute on step elements for external URL slides (sandboxed iframe)

### Dynamic Slide Editing
- [ ] Contenteditable overlay or separate editor UI for live slide editing
- [ ] Save edits back to source file (.md or .html)
- [ ] Re-generate blob URL after edits
- [ ] Undo/redo support

### Window Mirroring
- [ ] OS-level screen capture (Tauri screen/plugin)
- [ ] Mirror a specific window or region into a slide
- [ ] Live preview in controller, display in projector

---

## Electron Feature Parity (missing from Tauri)

### High Priority
- [x] **Refresh presentation** — Reload current file from disk without re-selecting
- [x] **Improved markdown parser** — Full CommonMark via `markdown-it` (tables, blockquotes, code blocks, raw HTML)
- [x] **Application menu** — Native menu bar: Load, Refresh, DevTools toggle
- [x] **Keyboard control toggle during transitions** — `keyboardEnabled` flag
- [x] **Button state sync** — `updateProjectorButtons()` after toggle

### Medium Priority
- [x] **Projector hide-on-close** — Intercept close event, hide instead of destroy
- [ ] **Rules/disclaimer overlay** — Toggle-able rules overlay on projector
- [ ] **Debug mode** — CLI flag to enable DevTools, verbose logging
- [ ] **File-based logging** — Write logs to `userData/log-YYYY-MM-DD.log`
- [x] **Window state persistence** — Save/restore controller window bounds + maximized state
- [x] **Audio muting on thumbnails** — `muted` attribute on iframe
- [ ] **Autoplay policy** — Set chromium flag `autoplay-policy=no-user-gesture-required`

### Low Priority
- [ ] **Remote Sources tab** — Placeholder exists in Electron, not ported
- [ ] **Options tab** — Placeholder exists in Electron, not ported
- [ ] **Restart application** — Flush viewer.html, reload both windows
- [ ] **Previewer multimedia stripping** — Separate `previewer.html` with videos replaced by placeholders for thumbnails
- [ ] **macOS lifecycle handling** — `window-all-closed` / `activate` platform checks
- [x] **DevTools access** — Per-webview DevTools via menu

---

## Code Quality

- [x] **Extract shared code** — presentation-utils.js, viewer-html-builder.js, i18n.js
- [ ] **Add jsdom to Node.js tests** — HTML extraction tests are currently skipped
- [ ] **i18n coverage** — sk.json has extra keys not in en.json; audit and clean up
- [ ] **Vite chunk splitting** — `viewer-html-builder.js` is 511 KB (3x impress.js); consider code-splitting per version

---

## Testing

- [ ] **End-to-end manual test** — Load each example presentation, verify:
  - Images render (Kaviár, turban)
  - Videos play (turban has mp4 files)
  - Audio plays
  - style.css applies (Kaviár, turban)
  - Slide navigation works (keyboard + buttons)
  - Thumbnails generate and update
  - Projector window syncs
  - Timer works
  - Version switching reloads correctly
- [ ] **Edge cases** — Empty presentations, single-slide, very large presentations, missing media files, corrupted zip files
- [ ] **Cross-platform test** — Verify on Linux (current), Windows, macOS

---

## Completed

- [x] Phase 1: Tauri scaffold + core IPC (18 commands)
- [x] Phase 2: Frontend port (controller, projector, viewer HTML/JS/CSS)
- [x] Phase 2.1: impress.js version support (v1.0.0, v1.1.0, v2.0.0 selectable)
- [x] Phase 3: Multi-window Controller+Projector with thumbnails
- [x] Media server: Local HTTP server with Range request support for video/audio
- [x] Font Awesome icons
- [x] Timer with pause/reset
- [x] Current slide preview in Slides List view
- [x] Video playback: safePlay() with readyState check
- [x] Phase 4 (partial): Refresh, window state, app menu, web slides
