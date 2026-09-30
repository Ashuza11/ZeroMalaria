#!/usr/bin/env bash
# ZeroMalaria — start API (http://127.0.0.1:8000) + web (http://localhost:5173)
# Usage (from the repo root):  bash scripts/dev.sh      Stop with Ctrl+C
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PY="$ROOT/.venv/bin/python"
if [ ! -x "$PY" ]; then
  echo "› Creating Python virtualenv (.venv)…"
  python3 -m venv .venv
fi
if ! "$PY" -c "import fastapi, sqlalchemy" 2>/dev/null; then
  echo "› Installing API requirements…"
  "$PY" -m pip install -r apps/api/requirements.txt
fi
if [ ! -d apps/web/node_modules ]; then
  echo "› Installing web dependencies…"
  (cd apps/web && npm install)
fi
if [ ! -f apps/api/zeromalaria.db ]; then
  echo "› Seeding database…"
  "$PY" apps/api/app/seed.py
fi

echo "› Starting API on http://127.0.0.1:8000"
(cd apps/api && "$PY" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT INT TERM

echo "› Starting web on http://localhost:5173"
cd apps/web && npm run dev
