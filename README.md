# impressPlayer

Standalone viewer and controller for [impress.js](https://impress.js.org) presentations. Built on Tauri v2 (Rust backend + HTML/JS frontend).

This app does not help you create impress.js presentations — it only helps with playing them. It accepts:

- `.html` files (impress.js presentations)
- `.md` files (Markdown, split into slides on `---` separators)
- `.zip` files (markpress presentations with a `style.css`)

## Features

- Two synchronized windows: a **controller** (slides, navigation, media controls, timer) and a **projector** (fullscreen display)
- **Browser projector**: an LAN-accessible HTTP server serves the presentation to any browser on the network with sound enabled, following the controller's slide and media state (URL shown in the controller footer)
- Static prerendered slide thumbnails (sidebar preview + overview grid)
- Video/audio playback served through a local HTTP server with Range support
- Native app menu (Open, Refresh, DevTools) and keyboard navigation
- Localized UI (English, Slovak)
- Bundled impress.js versions 1.0.0, 1.1.0, and 2.0.0 (switchable; 2.0.0 is the default)

## Requirements

- Node.js + npm
- Rust (stable) and Cargo
- Tauri system dependencies on Linux:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev libappindicator3-dev libgtk-3-dev
```

## Development

```bash
npm install          # install frontend deps
npx tauri dev        # run in dev mode with hot-reload
```

## Building

```bash
cargo tauri build    # build release binary for the current platform
```

Frontend-only build (outputs to `dist-frontend/`, used for validation):

```bash
npm run build:frontend
```

## Testing

```bash
npm test             # Vite build + Rust tests + example validation
cargo check          # fast type-check of Rust code
```

## Architecture

- `src-tauri/` — Rust backend: filesystem and dialog commands, settings persistence, ZIP extraction, local media HTTP server, LAN projector HTTP server, native menu
- `src/` — frontend: controller/projector windows, impress.js bundles, shared modules (viewer HTML builder, Markdown wrapping, i18n)

See `docs/decisions.md` for architectural decisions and `AGENTS.md` for implementation details.

## License

CC0-1.0
