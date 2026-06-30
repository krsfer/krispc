#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EMOTY_DIR="$SCRIPT_DIR/apps/emoty_web"
VENV_DIR="$SCRIPT_DIR/.venv"

# TLS cert for local HTTPS (Google OAuth rejects http on *.localhost subdomains).
# Generate with: mkcert -install && mkcert "*.localtest.me" localtest.me
TLS_CERT="${P2C_TLS_CERT:-$SCRIPT_DIR/_wildcard.localtest.me+1.pem}"
TLS_KEY="${P2C_TLS_KEY:-$SCRIPT_DIR/_wildcard.localtest.me+1-key.pem}"

usage() {
    echo "Usage: ./run.sh <command>"
    echo ""
    echo "Commands:"
    echo "  django     Run Django dev server (port 8000)"
    echo "  django-tls Run Django over HTTPS on https://p2c.localtest.me:8000 (for Google OAuth)"
    echo "  next       Build and start Next.js production server (port 3000)"
    echo "  next-dev   Run Next.js dev server (port 3000)"
    echo "  both       Run Django and Next.js dev servers together"
    echo "  both-tls   Like 'both' but Django over HTTPS (for Google OAuth)"
    exit 1
}

require_certs() {
    if [[ ! -f "$TLS_CERT" || ! -f "$TLS_KEY" ]]; then
        echo "Error: TLS cert/key not found:" >&2
        echo "  cert: $TLS_CERT" >&2
        echo "  key:  $TLS_KEY" >&2
        echo "Generate with:  mkcert -install && mkcert \"*.localtest.me\" localtest.me" >&2
        echo "Or set P2C_TLS_CERT and P2C_TLS_KEY to your cert paths." >&2
        exit 1
    fi
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

# Kill both dev servers (and their child processes) cleanly on Ctrl+C, then wait
# for them to exit before returning so their shutdown output is flushed before
# the shell prompt comes back (otherwise the terminal needs an extra Enter).
# Relies on `set -m` so each background job is its own process group; the leading
# `-` on the PID targets the whole group, killing npm's child node process too.
cleanup() {
    trap - INT TERM
    kill -TERM -"$DJANGO_PID" -"$NEXT_PID" 2>/dev/null || true
    wait 2>/dev/null || true
    exit 0
}

ensure_redis() {
    # Celery (delete events, calendar sync) uses Redis as its broker/result
    # backend and for distributed locks. In DEBUG tasks run eagerly in this
    # process, so a missing Redis fails at runtime with "Connection refused".
    # Check up front and fail fast with a clear message. Honors REDIS_URL the
    # same way settings.py does (default redis://localhost:6379).
    local url="${REDIS_URL:-redis://localhost:6379}"
    local hostport="${url#*://}"   # strip scheme
    hostport="${hostport%%/*}"     # strip /path
    hostport="${hostport##*@}"     # strip user:pass@
    local host port
    if [[ "$hostport" == *:* ]]; then
        host="${hostport%%:*}"
        port="${hostport##*:}"
    else
        host="$hostport"
        port="6379"
    fi
    [[ -z "$host" ]] && host="localhost"

    if (echo > "/dev/tcp/$host/$port") >/dev/null 2>&1; then
        return 0
    fi

    echo "Error: Redis not reachable at $host:$port (REDIS_URL=${REDIS_URL:-unset, using default})." >&2
    echo "Celery tasks (delete events, calendar sync) need Redis and will fail without it." >&2
    echo "Start it with:  brew services start valkey" >&2
    echo "Or set REDIS_URL to point at a running instance." >&2
    exit 1
}

ensure_vite_build() {
    # django-vite aborts page render without the manifest, and Django's system
    # check warns (W001/W004) when krispc/static/dist is missing. Build it once.
    if [[ ! -f "$SCRIPT_DIR/krispc/static/dist/.vite/manifest.json" ]]; then
        if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
            echo "Root node_modules missing, running npm install in $SCRIPT_DIR..."
            (cd "$SCRIPT_DIR" && npm install)
        fi
        echo "Vite manifest missing, running npm run build..."
        (cd "$SCRIPT_DIR" && npm run build)
    fi
}

run_django() {
    activate_venv
    ensure_redis
    ensure_vite_build
    echo "Starting Django on port 8000..."
    cd "$SCRIPT_DIR"
    python manage.py runserver
}

run_django_tls() {
    activate_venv
    ensure_redis
    ensure_vite_build
    require_certs
    echo "Starting Django (HTTPS) on https://p2c.localtest.me:8000 ..."
    cd "$SCRIPT_DIR"
    daphne -e "ssl:8000:privateKey=$TLS_KEY:certKey=$TLS_CERT" _main.asgi:application
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
    ensure_redis
    ensure_node_modules
    ensure_vite_build
    echo "Starting Django (8000) and Next.js dev (3000)..."
    set -m
    cd "$SCRIPT_DIR"
    python manage.py runserver &
    DJANGO_PID=$!
    cd "$EMOTY_DIR"
    npm run dev &
    NEXT_PID=$!
    trap cleanup INT TERM
    echo "Press Ctrl+C to stop both servers"
    wait
}

run_both_tls() {
    activate_venv
    ensure_redis
    ensure_node_modules
    ensure_vite_build
    require_certs
    echo "Starting Django (HTTPS 8000) and Next.js dev (3000)..."
    set -m
    cd "$SCRIPT_DIR"
    daphne -e "ssl:8000:privateKey=$TLS_KEY:certKey=$TLS_CERT" _main.asgi:application &
    DJANGO_PID=$!
    cd "$EMOTY_DIR"
    npm run dev &
    NEXT_PID=$!
    trap cleanup INT TERM
    echo "Press Ctrl+C to stop both servers"
    wait
}

[[ $# -lt 1 ]] && usage
case "$1" in
    django)     run_django ;;
    django-tls) run_django_tls ;;
    next)       run_next ;;
    next-dev)   run_next_dev ;;
    both)       run_both ;;
    both-tls)   run_both_tls ;;
    *)          usage ;;
esac
