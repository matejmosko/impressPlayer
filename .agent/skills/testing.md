# Testing Skill

## Scope
Test suite in `tests/` and `src-tauri/tests/`: Vite build, Rust tests, Node.js frontend tests, example validation.

## Test Script
- `tests/run_tests.sh` — main test runner (6 stages)
- `tests/test-frontend.js` — Node.js tests (jsdom, 40 tests)

## Test Stages (run in order)
1. **Vite frontend build** — `npx vite build --config vite.config.mjs`
2. **Rust cargo build** — `cargo build --manifest-path src-tauri/Cargo.toml`
3. **Rust integration tests** — `cargo test --manifest-path src-tauri/Cargo.toml` (21 tests)
4. **Node.js frontend tests** — `node tests/test-frontend.js` (40 tests)
5. **Example file validation** — checks HTML/MD presentations, style.css, impress.js versions exist
6. **Vite build output validation** — verifies `dist-frontend/` has controller.html, projector.html, viewer.html, controller JS, shared modules JS

## Running Tests
```bash
npm test                  # full suite (all 6 stages)
cargo test --manifest-path src-tauri/Cargo.toml  # Rust only
node tests/test-frontend.js  # Node.js only
```

## Rust Tests (in command files)
- `media_server.rs` — `server_serves_full_and_ranged_requests`, `server_serves_connections_concurrently`
- `projector_server.rs` — `percent_decode_handles_encoding`, `state_json_shape`, `server_serves_page_state_and_media`

## Node.js Frontend Tests (`tests/test-frontend.js`)
- Markdown parsing (markdown-it)
- HTML extraction (jsdom)
- Thumbnail id assignment (matches impress.js runtime)
- Viewer HTML generation
- Asset rewriting for browser projector

## Example Files Validated
- HTML: `examples/impress.js tests/2D-navigation/index.html`, `3D-positions`, `3D-rotations`, `classic-slides`, `cube`, `markdown`
- MD: `examples/Kaviár 2026-05-14/quiz.md`, `examples/turban 2026 Noc múzeí/quiz.md`
- CSS: corresponding `style.css` files
- impress.js: `src/js/impressjs/impress-v{1.0.0,1.1.0,2.0.0}.js`

## Gotchas
- `jsdom` is a devDependency for HTML extraction tests
- Tests must run from repo root (`tests/run_tests.sh` handles this)
- Stage 6 requires `dist-frontend/` from Stage 1
- No linter/typecheck — only build and test validation