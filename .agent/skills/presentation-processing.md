# Presentation Processing Skill

## Scope
Loading, parsing, and rendering presentations (.md, .html, .zip). Media handling, thumbnails, browser projector.

## Loading Flow
1. User clicks Open → native dialog (`selectFile()`)
2. `invoke('read_file')` → content parsed:
   - `.md` → `markdown-it` with `---` slide separators, wrapped in impress.js structure
   - `.html` → extract `<div id="impress">` content
   - `.zip` → `invoke('extract_zip')` → find `index.html` + `style.css`
3. `invoke('start_media_server')` for presentation dir → `http://127.0.0.1:{port}/`
4. `rewriteMediaToHttp()` rewrites `<video|audio|source>` src to media server URLs
5. `getViewerHtml()` builds self-contained HTML (inlines impress.js, normalize CSS, content, viewer script)
6. Blob URL created → loaded into controller iframe
7. `emit('loadProjection', { file, slide })` → projector loads same blob, navigates to slide
8. Viewer iframe `impress().init()` → reports `stepList` via `postMessage`
9. Controller builds thumbnails via `generateSlideThumbnails()` → blob URL iframes (sidebar + overview)

## Media Serving
- **Media server** (`127.0.0.1`): local HTTP with Range support for video/audio (asset:// doesn't support Range on WebKit2GTK)
- **Projector server** (`0.0.0.0`): LAN HTTP for browser projector, reuses media server's `serve_file_request` for `/media/*`

## Browser Projector
- `start_projector_server(dir)` → binds `0.0.0.0:<port>`, returns LAN URL (shown in `#projectorUrlLabel`)
- Controller builds second viewer page: `rewriteAssetsToServer()` → `http://<lan-ip>:<port>/media/<path>`, `getViewerHtml(baseDir=null)`, `set_projector_page(html, dir)`
- Controller pushes slide + `mediaSync {time, playing}` via `update_projection_state`
- Browser page (`isBrowser` mode): sound on, polls `/state` 250ms → `impress().goto(slide)` + `applyMediaSync(media)`
- Page swap: `set_projector_page` increments `rev`, injected into page (`/*__PROJECTOR_REV__*/`), browser reloads on rev mismatch
- Security: no auth, anyone on LAN can view, stops on app exit (Drop)

## Thumbnail Generation
- `generateSlideThumbnails()` → static HTML per slide (content + normalize CSS, **no impress.js**)
- CSS order: base `html,body{}` → `styleContent` → `.step` fit override
- Id assignment: `step-{index+1}` for id-less steps (index over ALL `.step` in DOM order)
- Must match impress.js runtime: `el.id = "step-" + (idx + 1)` in all 3 versions
- Rendered via blob URLs, cached in `thumbnailBlobUrls`, cleared on reload
- Sidebar: 2 previews (Presentation: next 2; Slides List: current + next)
- Overview: eager sequential `loadOverviewThumb()` chain
- Non-interactive: `.impressCurtain` + `pointer-events: none`

## Key Functions
- `src/shared/presentation-utils.js`: `wrapMarkdown()`, `extractHtmlPresentation()`
- `src/shared/viewer-html-builder.js`: `getViewerHtml()`, `generateSlideThumbnails()`, `rewriteAssetsToServer()`, `rewriteMediaToHttp()`
- `src/controller-script.js`: `loadPresentation()`, `renderNextSlide()`, `updateSidebarThumbnails()`, `loadOverviewThumb()`

## Impress.js Versions
- v1.0.0 (2018): plugin architecture
- v1.1.0 (2020): media plugin, relative positioning
- v2.0.0 (2022, default): 1920×1080 default, relative rotations
- Selected via dropdown in controller header → `set_impress_version` + reload