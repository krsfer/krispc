#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EMOTY_DIR="$SCRIPT_DIR/apps/emoty_web"
VENV_DIR="$SCRIPT_DIR/.venv"

usage() {
    echo "Usage: ./run.sh <command>"
    echo ""
    echo "Commands:"
    echo "  django     Run Django dev server (port 8000)"
    echo "  next       Build and start Next.js production server (port 3000)"
    echo "  next-dev   Run Next.js dev server (port 3000)"
    echo "  both       Run Django and Next.js dev servers together"
    exit 1
}

activate_venv() {
    if [[ -f "$VENV_DIR/bin/activate" ]]; then
        # shellcheck disable=SC1091
        source "$VENV_DIR/bin/activate"
    else
        echo "Error: virtualenv not found at $VENV_DIR" >&2
        echo "Create it with:  python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" >&2
        exit 1
    fi
}

ensure_node_modules() {
    if [[ ! -d "$EMOTY_DIR/node_modules" ]]; then
        echo "node_modules missing, running npm install in $EMOTY_DIR..."
        (cd "$EMOTY_DIR" && npm install)
    fi
}

run_django() {
    activate_venv
    echo "Starting Django on port 8000..."
    cd "$SCRIPT_DIR"
    python manage.py runserver
}

run_next() {
    ensure_node_modules
    echo "Building Next.js..."
    cd "$EMOTY_DIR"
    npm run build
    echo "Starting Next.js on port 3000..."
    npx next start -p 3000 -H 0.0.0.0
}

run_next_dev() {
    ensure_node_modules
    echo "Starting Next.js dev server on port 3000..."
    cd "$EMOTY_DIR"
    npm run dev
}

run_both() {
    activate_venv
    ensure_node_modules
    echo "Starting Django (8000) and Next.js dev (3000)..."
    cd "$SCRIPT_DIR"
    python manage.py runserver &
    DJANGO_PID=$!
    cd "$EMOTY_DIR"
    npm run dev &
    NEXT_PID=$!
    trap 'kill $DJANGO_PID $NEXT_PID 2>/dev/null; exit' INT TERM
    echo "Press Ctrl+C to stop both servers"
    wait
}

[[ $# -lt 1 ]] && usage
case "$1" in
    django)   run_django ;;
    next)     run_next ;;
    next-dev) run_next_dev ;;
    both)     run_both ;;
    *)        usage ;;
esac
