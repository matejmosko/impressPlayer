# Build & Dev Workflow Skill

## Scope
Development commands, build process, Vite/Tauri configuration, dev server.

## Key Config Files
- `package.json` — npm scripts, deps
- `vite.config.mjs` — Vite config (root: `src`, port 1420, outDir: `../dist-frontend`, 3 entry points)
- `src-tauri/tauri.conf.json` — Tauri config (frontendDist: `../src`, CSP, windows, bundle)
- `src-tauri/Cargo.toml` — Rust deps (tauri v2, plugins, serde, zip, dirs, base64)

## Dev Commands
```bash
npm install                    # install frontend deps
npm run tauri:dev             # dev mode (Vite + Cargo hot-reload)
# or
npx tauri dev                 # same, via CLI
```

## Build Commands
```bash
npm run tauri:build           # release binary (cargo tauri build)
npm run build:frontend        # frontend only → dist-frontend/
cargo check                   # fast type-check (no build)
```

## Vite Config
- `root: 'src'` — serves from `src/` directly
- 3 entries: `controller.html`, `projector.html`, `viewer.html`
- Dev server: port 1420, strictPort
- Build output: `../dist-frontend/` (gitignored)

## Tauri Config
- `frontendDist: "../src"` — serves source directly (not `dist-frontend/`)
- `devUrl: "http://localhost:1420"` — Vite dev server
- `withGlobalTauri: true` — exposes `window.__TAURI__` globals
- CSP allows: `blob:`, `asset:`, `data:`, `http://127.0.0.1:*` for media/iframes
- Windows: `controller` (1200x800, visible), `projector` (1920x1080, hidden)
- Bundle: AppImage, deb (Linux); NSIS (Windows); icons

## Cargo Deps
- `tauri` v2 (protocol-asset feature)
- `tauri-plugin-fs`, `store`, `dialog`, `opener` v2
- `zip` v2 (extraction)
- `dirs` v6 (config dir)
- `base64` v0.22
- `serde` + `serde_json` (derive)

## Gotchas
- `resource_dir()` in dev mode ≠ `src/` — use `?raw` imports for bundling assets
- No linter/typecheck for JS (`.jshintrc`, `.csslintrc` exist but no runners)
- Linux deps: `libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libappindicator3-dev libgtk-3-dev`
- Frontend uses `window.__TAURI__` not `@tauri-apps/api` imports