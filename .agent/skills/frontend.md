# Frontend Skill

## Scope
HTML/JS/CSS in `src/`: controller, projector, viewer, shared modules, impress.js bundles.

## Key Files
- `src/controller.html` — controller UI (sidebar thumbnails, overview grid, `data-i18n` localization)
- `src/projector.html` — projector display
- `src/viewer.html` — default placeholder
- `src/controller-script.js` — controller logic: file dialog, navigation, keyboard, projector window mgmt, media controls, timer, thumbnails, projector server mgmt
- `src/projector-script.js` — projector logic: loads from controller (`#projector` mode), keyboard nav, fullscreen, reports slide changes
- `src/shared/viewer-html-builder.js` — builds self-contained viewer HTML blob (inlines impress.js, normalize CSS, content, viewer script); exports `generateSlideThumbnails()`, `rewriteAssetsToServer()`; modes: `#thumbnail`, `#projector`, `isBrowser`
- `src/shared/presentation-utils.js` — markdown wrapping (markdown-it), HTML extraction
- `src/shared/i18n.js` — i18n (en.json, sk.json), `navigator.language` detection, `__()`, `applyTranslations()`
- `src/locales/en.json`, `src/locales/sk.json` — translation files
- `src/css/` — controller/projector CSS, FontAwesome, fonts
- `src/js/impressjs/` — bundled impress.js v1.0.0, v1.1.0, v2.0.0 (default)

## Communication
- `window.__TAURI__` globals for IPC (`invoke`, `emit`, `listen`)
- `postMessage` for iframe ↔ parent (controller/projector ↔ viewer)
- Event map: `loadProjection`, `projector-ready`, `nextSlide`/`prevSlide`, `gotoSlide`, `setupEventHandlers`, `audioVideoControls`, `mediaSync`, `controller-slide-changed`, `menu-event`

## Viewer Modes
| Hash/Mode | Purpose |
|---|---|
| `#thumbnail` | Static thumbnails (no impress.js init, no events, responds to `gotoSlide` only) |
| `#projector` | Projector window (muted media, follows `mediaSync`) |
| `isBrowser` | LAN browser page (sound on, polls `/state` 250ms, ignores `audioVideoControls`) |

## Thumbnail Architecture
- Static HTML (content + normalize CSS inline, **no impress.js**)
- CSS order critical: base `html,body{}` before `styleContent`, `.step` fit override after
- Id assignment: `step-{index+1}` for id-less steps (matches impress.js runtime)
- Rendered via blob URLs, cached in `thumbnailBlobUrls`, cleared on reload
- Sidebar: 2 previews (Presentation mode: next 2; Slides List: current + next)
- Overview: eager sequential load via `loadOverviewThumb()` chain

## Commands
```bash
npm run build:frontend    # Vite build → dist-frontend/
npm run tauri:dev         # dev mode with hot-reload
```

## Gotchas
- Vite 8/Rolldown can't resolve `@tauri-apps/api` internals — use `window.__TAURI__`
- `?raw` imports for impress.js/CSS (bundled at build time, ~511 KB chunk)
- CSP in `tauri.conf.json` allows `blob:`, `asset:`, `data:` for iframes/media
- `vite.config.mjs` outputs to `dist-frontend/` but `tauri.conf.json` uses `frontendDist: "../src"`