#!/usr/bin/env bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$ROOT_DIR"

echo "======================================================================="
echo "   TeleFlow MTProto — Telegram Auto Responder & Follow-up Platform     "
echo "======================================================================="

# Trap Ctrl+C to gracefully stop sub-processes
trap 'echo ""; echo "Stopping all services..."; kill 0; exit' SIGINT SIGTERM EXIT

# 1. Start Python MTProto Telethon Bridge
echo ">> [1/4] Starting Python MTProto Bridge Daemon on http://127.0.0.1:8001..."
if [ ! -d "telegram-bridge/venv" ]; then
    python3 -m venv telegram-bridge/venv
    ./telegram-bridge/venv/bin/pip install -q -r telegram-bridge/requirements.txt
fi
(cd telegram-bridge && ./venv/bin/python server.py) &
BRIDGE_PID=$!

# 2. Start Laravel 12 API Backend
(cd backend && php artisan storage:link --quiet)
echo ">> [2/4] Starting Laravel 12 Backend API on http://127.0.0.1:8000..."
(cd backend && php artisan serve --host=127.0.0.1 --port=8000) &
BACKEND_PID=$!

# 3. Start Frontend UI
echo ">> [3/4] Starting Modern Light React Frontend on http://127.0.0.1:5173..."
(cd frontend && npm run dev -- --host 127.0.0.1 --port 5173) &
FRONTEND_PID=$!

# 4. Start Background Follow-up Worker
echo ">> [4/4] Starting Automated Follow-up Worker (Runs every 5s)..."
(cd backend && while true; do php artisan telegram:process-scheduled-messages --quiet 2>/dev/null; sleep 5; done) &
WORKER_PID=$!

echo ""
echo "All services launched successfully!"
echo "-----------------------------------------------------------------------"
echo "-> Web Application UI:        http://127.0.0.1:5173"
echo "-> Laravel REST API:          http://127.0.0.1:8000/api"
echo "-> Python Telethon Bridge:    http://127.0.0.1:8001"
echo "-----------------------------------------------------------------------"
echo "Default Super Admin Credentials:"
echo "Email:    admin@telegram.local"
echo "Password: Password123!"
echo "-----------------------------------------------------------------------"
echo "Press Ctrl+C to terminate all services."

# Wait for processes
wait
