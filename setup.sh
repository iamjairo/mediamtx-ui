#!/usr/bin/env bash
set -euo pipefail

echo "MediaMTX Dashboard Setup"
echo "========================"
echo ""

# Copy default configs
cp -n .env.default .env 2>/dev/null || true
cp -n config/mediamtx.default.yml config/mediamtx.yml 2>/dev/null || true
cp -n config/auth.default.json config/auth.json 2>/dev/null || true

# Create required directories
mkdir -p data media recordings config/backup

echo "Configuration files created."
echo ""
echo "Edit .env and config/mediamtx.yml as needed, then choose a deployment:"
echo ""
echo "  Development (dashboard only):"
echo "    docker compose build && docker compose up -d"
echo ""
echo "  MediaMTX server:"
echo "    docker compose -f docker-compose-mediamtx.yml up -d"
echo ""
echo "  All-in-one (dashboard + mediamtx + caddy):"
echo "    docker compose -f docker-compose-all.yml up -d"
echo ""
echo "  Hardware accelerated (VAAPI/QSV):"
echo "    docker compose -f docker-compose-hwaccel.yml up -d"
echo ""
echo "  Desktop app (Electron):"
echo "    cd desktop/electron && npm install && npm start"
echo ""
echo "  Desktop app (Tauri):"
echo "    cd desktop/tauri && cargo tauri dev"
