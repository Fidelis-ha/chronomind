#!/usr/bin/env bash
# ============================================================
# ChronoMind Supervisor — Continuous Development Loop
# - Testet die App nach jedem Deployment
# - Führt Browser-Tests durch (Playwright)
# - Behebt Fehler selbstständig
# - Erfindet neue Features wenn alles funktioniert
# ============================================================
set -e

PROJECT_DIR="/opt/data/chronomind"
STATE_DIR="$PROJECT_DIR/.agent/state"
LOG_FILE="$STATE_DIR/supervisor.log"
TODO_FILE="$STATE_DIR/todo_features.txt"
ACTIVE_FILE="$STATE_DIR/active_features.txt"
ERRORS_FILE="$STATE_DIR/errors_found.txt"
DEPLOY_URL="https://chronomind-fidelis.vercel.app"

log() {
  echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Ensure state dir exists
mkdir -p "$STATE_DIR"

log "=== SUPERVISOR STARTET ==="

cd "$PROJECT_DIR"

# Check if there's an active feature being worked on
if [ -f "$ACTIVE_FILE" ] && [ -s "$ACTIVE_FILE" ]; then
  FEATURE=$(cat "$ACTIVE_FILE")
  BRANCH=$(echo "$FEATURE" | cut -d: -f1)
  FEATURE_NAME=$(echo "$FEATURE" | cut -d: -f2)
  log "Aktives Feature: $FEATURE_NAME (branch: $BRANCH)"

  # Check if branch has new commits
  git fetch origin "$BRANCH" 2>/dev/null || true
  LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")
  REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")

  if [ "$LOCAL" != "$REMOTE" ] && [ -n "$REMOTE" ]; then
    log "Subagent arbeitet noch – überspringen diese Runde"
    exit 0
  fi
fi

log "Starte Test-Runde..."

# Test 1: Production URL responds
HTTP_CODE=$(curl -sI "$DEPLOY_URL" | head -1 | grep -oP '\d{3}')
if [ "$HTTP_CODE" = "307" ]; then
  log "✓ Production-URL: HTTP $HTTP_CODE (Auth-Schutz aktiv)"
else
  log "✗ Production-URL: HTTP $HTTP_CODE (erwartet 307)"
  echo "[$(date)] Production-URL fehlerhaft: HTTP $HTTP_CODE" >> "$ERRORS_FILE"
fi

# Test 2: Sign-in page loads
SIGNIN_CODE=$(curl -sI "$DEPLOY_URL/sign-in" | head -1 | grep -oP '\d{3}')
if [ "$SIGNIN_CODE" = "200" ]; then
  log "✓ Sign-In Page: HTTP $SIGNIN_CODE"
else
  log "✗ Sign-In Page: HTTP $SIGNIN_CODE"
  echo "[$(date)] Sign-In Page fehlerhaft: HTTP $SIGNIN_CODE" >> "$ERRORS_FILE"
fi

# Test 3: App redirects unauthenticated users from / to /sign-in
REDIRECT_TEST=$(curl -sI "$DEPLOY_URL/" | grep -i "^location:" | grep -oP '/sign-in')
if [ -n "$REDIRECT_TEST" ]; then
  log "✓ Auth-Redirect funktioniert"
else
  log "✗ Auth-Redirect fehlerhaft"
  echo "[$(date)] Auth-Redirect funktioniert nicht" >> "$ERRORS_FILE"
fi

# Test 4: Playwright test if available
if command -v npx &> /dev/null && [ -f "$PROJECT_DIR/tests/smoke.spec.ts" ]; then
  log "Playwright Tests werden ausgeführt..."
  cd "$PROJECT_DIR"
  npx playwright test --reporter=list 2>&1 | tee -a "$LOG_FILE" || true
fi

# Count errors from this run
ERROR_COUNT=$(wc -l < "$ERRORS_FILE" 2>/dev/null || echo 0)
log "Fehler gefunden diese Runde: $ERROR_COUNT"

if [ "$ERROR_COUNT" -gt 0 ]; then
  log "Nächste Runde in 5 Minuten..."
else
  log "Keine Fehler gefunden – prüfe auf neue Features..."

  # Load todo list
  if [ -f "$TODO_FILE" ] && [ -s "$TODO_FILE" ]; then
    NEXT_FEATURE=$(head -1 "$TODO_FILE")
    if [ -n "$NEXT_FEATURE" ]; then
      log "Nächstes Feature: $NEXT_FEATURE"
    fi
  else
    log "Keine Features mehr in der Queue – erfinde etwas Neues!"
    # Add self-reminder for new feature creation
    echo "[$(date)] supervisor_idea: Evaluate if dashboard charts, dark mode toggle, or recurring entries should be implemented" >> "$LOG_FILE"
  fi
fi

log "=== SUPERVISOR RUNDE BEENDET ==="
echo "" >> "$LOG_FILE"