#!/usr/bin/env bash
# ============================================================
# ChronoMind Supervisor
# Prüft alle 15 Min ob Subagenten arbeiten
# Startet neue wenn nötig
# ============================================================
set -e

PROJECT_DIR="/opt/data/chronomind"
STATE_DIR="$PROJECT_DIR/.agent/state"
ACTIVE_FILE="$STATE_DIR/active_features.txt"
LOG_FILE="$STATE_DIR/supervisor.log"
VERCEL_TOKEN=$(cat /opt/data/.env.vercel | grep vercel_token | cut -d= -f2)

echo "=== SUPERVISOR $(date) ===" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# Prüfe ob bereits ein Feature programmiert wird
if [ -f "$ACTIVE_FILE" ] && [ -s "$ACTIVE_FILE" ]; then
  FEATURE=$(cat "$ACTIVE_FILE")
  BRANCH=$(echo "$FEATURE" | cut -d: -f1)
  FEATURE_NAME=$(echo "$FEATURE" | cut -d: -f2)

  echo "Aktives Feature: $FEATURE_NAME (branch: $BRANCH)"

  # Prüfe ob Branch existiert und Commits macht
  git fetch origin "$BRANCH" 2>/dev/null || true
  LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")
  Remote=$(git rev-parse origin/$BRANCH 2>/dev/null || echo "")

  if [ "$LOCAL" != "$Remote" ]; then
    echo "Subagent arbeitet noch (neue Commits vorhanden)"
    echo "Letzter Stand: $(git log -1 --format='%h %s' HEAD)"
  else
    echo "Keine neuen Commits – subagent braucht vielleicht Hilfe oder ist fertig"
  fi
else
  echo "Kein aktives Feature – suche nächstes Feature..."
  # Hier können Features reingeschrieben werden
fi

echo "---" >> "$LOG_FILE"
