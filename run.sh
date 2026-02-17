#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EMOTY_DIR="$SCRIPT_DIR/apps/emoty_web"

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

run_django() {
    echo "Starting Django on port 8000..."
    cd "$SCRIPT_DIR"
    python manage.py runserver
}

run_next() {
    echo "Building Next.js..."
    cd "$EMOTY_DIR"
    npm run build
    echo "Starting Next.js on port 3000..."
    npx next start -p 3000 -H 0.0.0.0
}

run_next_dev() {
    echo "Starting Next.js dev server on port 3000..."
    cd "$EMOTY_DIR"
    npm run dev
}

run_both() {
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
