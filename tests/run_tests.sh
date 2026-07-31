#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

PASSED=0
FAILED=0
TOTAL=0

run_test() {
  local name="$1"
  shift
  TOTAL=$((TOTAL + 1))
  echo ""
  echo "━━━ [$TOTAL] $name ━━━"
  if "$@"; then
    PASSED=$((PASSED + 1))
    echo "  ✓ PASS"
  else
    FAILED=$((FAILED + 1))
    echo "  ✗ FAIL (exit code $?)"
  fi
}

echo "╔══════════════════════════════════════════════════╗"
echo "║        impressPlayer Test Suite                 ║"
echo "╚══════════════════════════════════════════════════╝"

# ── 1. Vite frontend build ───────────────────────────────────────
run_test "Vite frontend build" \
  npx vite build --config vite.config.mjs 2>&1

# ── 2. Rust cargo build ──────────────────────────────────────────
run_test "Rust cargo build" \
  cargo build --manifest-path src-tauri/Cargo.toml 2>&1

# ── 3. Rust integration tests ────────────────────────────────────
run_test "Rust integration tests (21 tests)" \
  cargo test --manifest-path src-tauri/Cargo.toml 2>&1

# ── 4. Node.js frontend tests ───────────────────────────────────
run_test "Node.js frontend tests (40 tests)" \
  node tests/test-frontend.js 2>&1

# ── 5. Example file validation ───────────────────────────────────
echo ""
echo "━━━ [$((TOTAL + 1))] Example File Validation ━━━"
TOTAL=$((TOTAL + 1))
VALIDATION_OK=true

echo "  Checking HTML presentations..."
for f in \
  "examples/impress.js tests/2D-navigation/index.html" \
  "examples/impress.js tests/3D-positions/index.html" \
  "examples/impress.js tests/3D-rotations/index.html" \
  "examples/impress.js tests/classic-slides/index.html" \
  "examples/impress.js tests/cube/index.html" \
  "examples/impress.js tests/markdown/index.html"; do
  if [ -f "$f" ]; then
    SIZE=$(wc -c < "$f")
    HAS_IMPRESS=$(grep -c "impress" "$f" || true)
    echo "    ✓ $(basename "$(dirname "$f")")/index.html — ${SIZE}B, impress refs: ${HAS_IMPRESS}"
  else
    echo "    ✗ MISSING: $f"
    VALIDATION_OK=false
  fi
done

echo "  Checking MD presentations..."
for f in \
  "examples/Kaviár 2026-05-14/quiz.md" \
  "examples/turban 2026 Noc múzeí/quiz.md"; do
  if [ -f "$f" ]; then
    SIZE=$(wc -c < "$f")
    SLIDES=$(grep -c "^-----$" "$f" || true)
    SLIDES=$((SLIDES + 1))
    echo "    ✓ $(basename "$(dirname "$f")")/quiz.md — ${SIZE}B, ~${SLIDES} slides"
  else
    echo "    ✗ MISSING: $f"
    VALIDATION_OK=false
  fi
done

echo "  Checking style.css files..."
for f in \
  "examples/Kaviár 2026-05-14/style.css" \
  "examples/turban 2026 Noc múzeí/style.css"; do
  if [ -f "$f" ]; then
    SIZE=$(wc -c < "$f")
    echo "    ✓ $(basename "$(dirname "$f")")/style.css — ${SIZE}B"
  else
    echo "    ✗ MISSING: $f"
    VALIDATION_OK=false
  fi
done

echo "  Checking impress.js versions..."
for v in \
  "src/js/impressjs/impress-v1.0.0.js" \
  "src/js/impressjs/impress-v1.1.0.js" \
  "src/js/impressjs/impress-v2.0.0.js"; do
  if [ -f "$v" ]; then
    SIZE=$(wc -c < "$v")
    BASENAME=$(basename "$v")
    echo "    ✓ $BASENAME — ${SIZE}B"
  else
    echo "    ✗ MISSING: $v"
    VALIDATION_OK=false
  fi
done

if $VALIDATION_OK; then
  PASSED=$((PASSED + 1))
  echo "  ✓ PASS"
else
  FAILED=$((FAILED + 1))
  echo "  ✗ FAIL"
fi

# ── 6. Vite build output validation ─────────────────────────────
echo ""
echo "━━━ [$((TOTAL + 1))] Vite Build Output Validation ━━━"
TOTAL=$((TOTAL + 1))
BUILD_OK=true

echo "  Checking dist-frontend/ output..."
for f in \
  "dist-frontend/controller.html" \
  "dist-frontend/projector.html" \
  "dist-frontend/viewer.html"; do
  if [ -f "$f" ]; then
    echo "    ✓ $(basename "$f")"
  else
    echo "    ✗ MISSING: $f"
    BUILD_OK=false
  fi
done

# Check that controller JS is built
CTRL_JS=$(ls dist-frontend/assets/controller-*.js 2>/dev/null | head -1)
if [ -n "$CTRL_JS" ]; then
  SIZE=$(wc -c < "$CTRL_JS")
  echo "    ✓ controller JS — ${SIZE}B"
else
  echo "    ✗ MISSING: controller JS bundle"
  BUILD_OK=false
fi

# Check that shared modules (markdown-it, viewer-html-builder) are built
SHARED_JS=$(ls dist-frontend/assets/presentation-utils-*.js 2>/dev/null | head -1)
if [ -n "$SHARED_JS" ]; then
  SIZE=$(wc -c < "$SHARED_JS")
  echo "    ✓ shared modules JS — ${SIZE}B"
else
  echo "    ✗ MISSING: shared modules JS bundle"
  BUILD_OK=false
fi

if $BUILD_OK; then
  PASSED=$((PASSED + 1))
  echo "  ✓ PASS"
else
  FAILED=$((FAILED + 1))
  echo "  ✗ FAIL"
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Results: $PASSED passed, $FAILED failed, $TOTAL total"
echo "╚══════════════════════════════════════════════════╝"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
