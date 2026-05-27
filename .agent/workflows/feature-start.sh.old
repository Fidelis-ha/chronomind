#!/usr/bin/env bash
# ============================================================
# ChronoMind Feature-Workflow
# Ein Subagent führt dieses Script aus
# ============================================================
set -e

FEATURE_NAME="${1:-feature/unknown}"
FEATURE_BRANCH="fidelis/$FEATURE_NAME"
PROJECT_DIR="/opt/data/chronomind"
STATE_DIR="$PROJECT_DIR/.agent/state"
LOG_FILE="$STATE_DIR/feature_${FEATURE_NAME//\//_}.log"
VERCEL_TOKEN=$(cat /opt/data/.env.vercel 2>/dev/null | grep vercel_token | cut -d= -f2 || echo "")

echo "=== FEATURE WORKFLOW START ==="
echo "Feature: $FEATURE_NAME"
echo "Branch: $FEATURE_BRANCH"
echo "Zeit: $(date)"
echo "PID: $$"

cd "$PROJECT_DIR"

# Aktives Feature merken
echo "$FEATURE_BRANCH:$FEATURE_NAME" > "$STATE_DIR/active_features.txt"
echo "Feature gestartet: $FEATURE_NAME" >> "$LOG_FILE"

# --- Feature Branch erstellen ---
git checkout main
git pull origin main
git checkout -b "$FEATURE_BRANCH"
echo "Branch $FEATURE_BRANCH erstellt"

# --- Vercel Preview Deployment ---
echo "Deploye zu Vercel Preview..."
VERCEL_OUTPUT=$(npx vercel --yes --token "$VERCEL_TOKEN" --prod=false 2>&1)
echo "$VERCEL_OUTPUT"

# Extrahiere Preview URL
PREVIEW_URL=$(echo "$VERCEL_OUTPUT" | grep -o 'https://[^ ]*\.vercel\.app' | head -1)

if [ -n "$PREVIEW_URL" ]; then
  echo "Preview URL: $PREVIEW_URL"
  echo "Preview: $PREVIEW_URL" >> "$STATE_DIR/preview_url.txt"

  # Link für Marc speichern
  echo "VERCEL_PREVIEW_URL=$PREVIEW_URL" > "$STATE_DIR/current_preview.env"

  # Telegram-Nachricht senden
  curl -s "https://api.telegram.org/bot$(cat /opt/data/.env | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)/sendMessage" \
    -d "chat_id=58614728" \
    -d "text=🧠 *ChronoMind* Feature aktiv: *$FEATURE_NAME*
🔗 Vorschau: $PREVIEW_URL

@Fidelis programmiert..." \
    -d "parse_mode=Markdown" 2>/dev/null || true
fi

echo "=== WORKFLOW BEREIT FÜR FEATURE-IMPLEMENTIERUNG ==="
echo "Warte auf Anweisungen..."
