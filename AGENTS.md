# AGENTS.md

## Project

Electron app for viewing impress.js presentations. Supports `.md`, `.html`, and `.zip` (markpress) inputs. Entry: `main.js`.

## Architecture

- **main.js** — Electron main process. Creates 3 windows: inv (invisible bootstrap), controller (UI), projector (fullscreen display).
- **js/inv.js** — Renderer process that bootstraps the UI. Reads `.tpl` templates from `templates/`, renders them with Mustache, writes output to `userData` directory.
- **templates/*.tpl** — Mustache templates for controller, projector, viewer. Rendered at runtime (not build time).
- **js/controller-script.js**, **js/projector-script.js**, **js/viewer-script.js** — Renderer-side scripts for each window.
- **js/impressjs/** — Bundled impress.js library.
- **locales/** — i18n JSON files (`en.json`, `sk.json`). Translated via `{{#i18n}}...{{/i18n}}` Mustache helper in templates.

## Generated Files (gitignored)

`viewer.html`, `controller.html`, `projector.html` in root are **generated at runtime** into the user data directory, not built. They appear in `.gitignore`.

## Commands

```
npm start          # Run the app (electron . --disable-gpu-sandbox)
npm run debug      # Run with inspector on port 5858
npm run pack       # Build unpacked directory
npm run dist       # Build distributable (electron-builder)
```

## Setup Gotchas

- `postinstall` runs `electron-rebuild` automatically. If native modules fail, run: `./node_modules/.bin/electron-rebuild`
- `.npmrc` sets `runtime = electron` and `target = 1.7.6` — this is **stale** (package.json has electron ^25.1.0). Native modules may need manual rebuild.
- No test suite, no linter script, no typecheck. `.jshintrc` exists but has no runner configured.
- CSS linting config exists (`.csslintrc`) but no runner is configured.
