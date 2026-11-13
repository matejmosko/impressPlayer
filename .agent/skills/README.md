# Skills Index

Load the skill relevant to your task:

| Skill | File | When to Use |
|---|---|---|
| **Tauri Backend** | `tauri-backend.md` | Rust commands, state, servers, IPC, window management, settings persistence |
| **Frontend** | `frontend.md` | Controller/projector/viewer HTML/JS/CSS, shared modules, impress.js, thumbnails, i18n |
| **Testing** | `testing.md` | Running test suite, Rust/Node tests, example validation, Vite build validation |
| **Build & Dev** | `build-dev.md` | Dev commands, Vite/Tauri/Cargo config, build process, system dependencies |
| **Presentation Processing** | `presentation-processing.md` | Loading/parsing presentations, media servers, browser projector, thumbnail generation |

## Usage
```
# Load a skill
skill tauri-backend
skill frontend
skill testing
skill build-dev
skill presentation-processing
```

## Project Structure Reference
```
src-tauri/           # Rust backend (tauri-backend skill)
  src/
    main.rs, lib.rs, state.rs
    commands/        # all command handlers
  tauri.conf.json
  Cargo.toml
  capabilities/
  tests/

src/                 # Frontend (frontend skill)
  controller.html, projector.html, viewer.html
  controller-script.js, projector-script.js
  shared/            # viewer-html-builder.js, presentation-utils.js, i18n.js
  locales/
  css/
  js/impressjs/      # 3 bundled versions

tests/               # Testing (testing skill)
  run_tests.sh
  test-frontend.js

docs/
  decisions.md       # Architecture decisions
  todo.md            # Task status & roadmap
```