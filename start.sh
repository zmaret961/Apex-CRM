#!/usr/bin/env bash
# Apex — one-command startup. Run: ./start.sh   (or double-click start.command on macOS)
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

echo "Starting Apex on http://localhost:3000"
echo "(database auto-seeds on first launch)"
npm run dev
