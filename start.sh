#!/usr/bin/env bash
# Apex — one-command startup. Run: ./start.sh   (or double-click start.command on macOS)
# Defaults to the fast production build. For development mode: ./start.sh dev
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it from https://nodejs.org (v20+), then re-run."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies…"
  npm install
fi

if [ "${1:-}" = "dev" ]; then
  echo "Starting Apex in DEV mode on http://localhost:3000"
  exec npm run dev
fi

echo "Building Apex (one-time production build — this is what makes it fast)…"
npm run build
echo "Starting Apex on http://localhost:3000"
echo "(database auto-seeds on first launch; Ctrl-C to stop)"
exec npm start
