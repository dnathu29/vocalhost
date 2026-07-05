#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Checks ────────────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then echo "Error: python3 not found." && exit 1; fi
if ! command -v node &>/dev/null;    then echo "Error: node not found."    && exit 1; fi

# ── Backend .env ──────────────────────────────────────────────────────────────
if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo ""
  echo "  Created backend/.env from .env.example"
  echo "  Add your GRADIUM_API_KEY before using voice features."
  echo ""
fi

# ── Python venv ───────────────────────────────────────────────────────────────
if [ ! -d "$ROOT/backend/.venv" ]; then
  echo "Setting up Python virtual environment..."
  python3 -m venv "$ROOT/backend/.venv"
fi
source "$ROOT/backend/.venv/bin/activate"
pip install -q -r "$ROOT/backend/requirements.txt"

# ── Frontend deps ─────────────────────────────────────────────────────────────
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT/frontend" && npm install --silent)
fi

# ── Launch both ───────────────────────────────────────────────────────────────
echo ""
echo "  Starting VocalHost..."
echo "  Backend  →  http://localhost:8000"
echo "  Frontend →  http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# Trap Ctrl+C and kill both children
trap 'kill 0' SIGINT SIGTERM

(cd "$ROOT/backend" && source .venv/bin/activate && python -m uvicorn app:app --reload --port 8000) &
(cd "$ROOT/frontend" && npm run dev -- --port 3000) &

wait
