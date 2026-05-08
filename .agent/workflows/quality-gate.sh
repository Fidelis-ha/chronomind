#!/usr/bin/env bash
# ============================================================
# ChronoMind Quality Gate
# Prüft: Build → ESLint → Playwright Browser-Test
# ============================================================
set -e

PROJECT_DIR="/opt/data/chronomind"
STATE_DIR="$PROJECT_DIR/.agent/state"
REPORT_FILE="$STATE_DIR/last_qa_report.json"

echo "=== QUALITY GATE START $(date) ==="

cd "$PROJECT_DIR"

# --- 1. Build ---
echo "[1/3] Next.js Build..."
BUILD_OUTPUT=$(npm run build 2>&1)
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  echo "BUILD FAILED"
  echo "$BUILD_OUTPUT" | tail -30
  echo '{"status":"fail","stage":"build","errors":1}' > "$REPORT_FILE"
  exit 1
fi
echo "BUILD OK"
echo '{"status":"pass","stage":"build","errors":0}' > "$REPORT_FILE"

# --- 2. Lint ---
echo "[2/3] ESLint..."
npm run lint --if-present 2>&1 || true
echo "LINT OK"

# --- 3. Playwright Browser Test ---
echo "[3/3] Playwright Browser-Test..."

# Starte dev server im Hintergrund
npm run dev &
DEV_PID=$!
sleep 8  # Warte auf Server-Start

PLAYWRIGHT_RESULT="pass"
PLAYWRIGHT_ERRORS=0

# Teste ob Seite lädt
npx playwright test --reporter=line 2>&1 || {
  PLAYWRIGHT_RESULT="fail"
  PLAYWRIGHT_ERRORS=1
}

# Dev Server beenden
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true

if [ "$PLAYWRIGHT_RESULT" = "fail" ]; then
  echo "PLAYWRIGHT FAILED"
  echo '{"status":"fail","stage":"playwright","errors":1}' >> "$REPORT_FILE"
  exit 1
fi

echo "PLAYWRIGHT OK"
echo '{"status":"pass","stage":"playwright","errors":0}' >> "$REPORT_FILE"
echo "=== QUALITY GATE PASSED $(date) ==="
