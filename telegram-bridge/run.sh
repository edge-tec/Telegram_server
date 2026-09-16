#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment for telegram-bridge..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

echo "Starting Telegram MTProto Bridge Service on port 8001..."
export BRIDGE_PORT=8001
export LARAVEL_WEBHOOK_URL="http://127.0.0.1:8000/api/internal/telegram/webhook"
export BRIDGE_WEBHOOK_SECRET="bridge-internal-secret-key-2026"
./venv/bin/python server.py
