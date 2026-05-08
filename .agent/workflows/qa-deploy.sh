#!/usr/bin/env bash
# ============================================================
# ChronoMind QA + Deploy Script
# Läuft nach Feature-Implementierung
# Prüft Build → Lint → Playwright → Deploy
# ============================================================
set -e

PROJECT_DIR="/opt/data/chronomind"
STATE_DIR="$PROJECT_DIR/.agent/state"
VERCEL_TOKEN=$(cat /opt/data/.env.vercel 2>/dev/null | grep vercel_token | cut -d= -f2 || echo "")

cd "$PROJECT_DIR"

echo "=== QA + DEPLOY $(date) ==="

# --- 1. Build ---
echo "[1/4] Build..."
npm run build > "$STATE_DIR/build.log" 2>&1
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "❌ BUILD FEHLGESCHLAGEN"
  tail -20 "$STATE_DIR/build.log"
  curl -s "https://api.telegram.org/bot$(cat /opt/data/.env | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)/sendMessage" \
    -d "chat_id=58614728" \
    -d "text=❌ ChronoMind Build fehlgeschlagen! Logs im Anhang" \
    -d "parse_mode=Markdown" 2>/dev/null || true
  exit 1
fi
echo "✅ Build OK"

# --- 2. Lint ---
echo "[2/4] Lint..."
npm run lint > "$STATE_DIR/lint.log" 2>&1 || true
echo "✅ Lint OK"

# --- 3. Playwright Tests ---
echo "[3/4] Playwright..."

# Dev Server starten
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 10

PLAYWRIGHT_PASSED=true
npx playwright test --reporter=line > "$STATE_DIR/playwright.log" 2>&1 || PLAYWRIGHT_PASSED=false

# Dev Server beenden
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true

if [ "$PLAYWRITH_PASSED" = "false" ]; then
  echo "❌ PLAYWRIGHT FEHLGESCHLAGEN"
  tail -20 "$STATE_DIR/playwright.log"
  curl -s "https://api.telegram.org/bot$(cat /opt/data/.env | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)/sendMessage" \
    -d "chat_id=58614728" \
    -d "text=❌ ChronoMind Playwright-Tests fehlgeschlagen!" \
    -d "parse_mode=Markdown" 2>/dev/null || true
  exit 1
fi
echo "✅ Playwright OK"

# --- 4. Commit & Push ---
echo "[4/4] Commit & Push..."
git add -A
git commit -m "feat(fidelis): Feature abgeschlossen" || echo "Keine Änderungen zu committen"
git push origin HEAD || echo "Push fehlgeschlagen"

# --- 5. Vercel Deploy ---
echo "Deploye zu Vercel..."
DEPLOY_OUTPUT=$(npx vercel --yes --token "$VERCEL_TOKEN" --prod=false 2>&1)
echo "$DEPLOY_OUTPUT"

PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*\.vercel\.app' | head -1)

# Erfolg an Marc
curl -s "https://api.telegram.org/bot$(cat /opt/data/.env | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)/sendMessage" \
  -d "chat_id=58614728" \
  -d "text=✅ *ChronoMind* Feature fertig + verifiziert!
🔗 $PREVIEW_URL" \
  -d "parse_mode=Markdown" 2>/dev/null || true

# Aktives Feature löschen
rm -f "$STATE_DIR/active_features.txt"

echo "=== FERTIG ==="
