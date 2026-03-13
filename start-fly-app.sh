#!/bin/bash
set -euo pipefail

READY_FILE="${KRISPC_READY_FILE:-/tmp/krispc-ready}"
APP_PORT="${PORT:-8080}"
NEXT_PORT="${EMOTY_PORT:-3000}"
PIDS=()

cleanup() {
    local exit_code=$?
    trap - EXIT INT TERM

    if [ ${#PIDS[@]} -gt 0 ]; then
        kill "${PIDS[@]}" 2>/dev/null || true
        wait "${PIDS[@]}" 2>/dev/null || true
    fi

    exit "$exit_code"
}

start_background() {
    "$@" &
    PIDS+=("$!")
}

start_background_shell() {
    bash -lc "$1" &
    PIDS+=("$!")
}

wait_for_port() {
    local host="$1"
    local port="$2"
    local timeout_seconds="$3"
    local service_name="$4"

    python - "$host" "$port" "$timeout_seconds" "$service_name" <<'PY'
import socket
import sys
import time

host = sys.argv[1]
port = int(sys.argv[2])
timeout_seconds = float(sys.argv[3])
service_name = sys.argv[4]
deadline = time.time() + timeout_seconds
last_error = None

while time.time() < deadline:
    try:
        with socket.create_connection((host, port), timeout=1):
            sys.exit(0)
    except OSError as exc:
        last_error = exc
        time.sleep(0.5)

print(
    f"[startup] Timed out waiting for {service_name} on {host}:{port}: {last_error}",
    file=sys.stderr,
)
sys.exit(1)
PY
}

trap cleanup EXIT INT TERM

rm -f "$READY_FILE"
export KRISPC_READY_FILE="$READY_FILE"

start_background daphne _main.asgi:application --port "$APP_PORT" --bind 0.0.0.0

wait_for_port 127.0.0.1 "$APP_PORT" 30 "Daphne"

python manage.py migrate --noinput
python manage.py enable_wal

start_background_shell "cd /app/apps/emoty_web && npm run start"

wait_for_port 127.0.0.1 "$NEXT_PORT" 30 "Emoty"

start_background celery -A _main worker -l info
start_background celery -A _main beat -l info

touch "$READY_FILE"
echo "[startup] Readiness file created at $READY_FILE"

wait -n "${PIDS[@]}"
