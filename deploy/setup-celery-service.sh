#!/bin/bash
# Setup script for Celery worker service
# This script helps set up either supervisord or systemd for Celery

set -e

PROJECT_DIR="/Users/chris/dev/src/py/krispcBase"
DEPLOY_DIR="$PROJECT_DIR/deploy"

echo "=== Celery Worker Service Setup ==="
echo ""
echo "Choose your service manager:"
echo "1) Supervisord (recommended for development/macOS)"
echo "2) Systemd (recommended for Linux production)"
echo "3) Manual (just create directories and show commands)"
echo ""
read -p "Enter choice [1-3]: " choice

# Create log directory
mkdir -p "$PROJECT_DIR/logs"

case $choice in
    1)
        echo ""
        echo "=== Setting up Supervisord ==="
        echo ""

        # Check if supervisord is installed
        if ! command -v supervisord &> /dev/null; then
            echo "Supervisord is not installed. Installing..."
            pip install supervisor
        fi

        # Create supervisord config if it doesn't exist
        if [ ! -f "$PROJECT_DIR/supervisord.conf" ]; then
            cat > "$PROJECT_DIR/supervisord.conf" << 'EOF'
[supervisord]
logfile=%(here)s/logs/supervisord.log
pidfile=%(here)s/supervisord.pid
childlogdir=%(here)s/logs

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix://%(here)s/supervisor.sock

[unix_http_server]
file=%(here)s/supervisor.sock

[include]
files = deploy/supervisord-*.conf
EOF
        fi

        echo "✓ Supervisord configuration created"
        echo ""
        echo "To start the Celery worker:"
        echo "  cd $PROJECT_DIR"
        echo "  supervisord -c supervisord.conf"
        echo ""
        echo "To manage workers:"
        echo "  supervisorctl -c supervisord.conf status"
        echo "  supervisorctl -c supervisord.conf start celery-worker"
        echo "  supervisorctl -c supervisord.conf stop celery-worker"
        echo "  supervisorctl -c supervisord.conf restart celery-worker"
        echo "  supervisorctl -c supervisord.conf tail -f celery-worker"
        echo ""
        ;;

    2)
        echo ""
        echo "=== Setting up Systemd (requires sudo) ==="
        echo ""

        # Create necessary directories
        sudo mkdir -p /var/log/celery
        sudo mkdir -p /var/run/celery
        sudo chown -R $USER:$USER /var/log/celery
        sudo chown -R $USER:$USER /var/run/celery

        # Copy service files
        sudo cp "$DEPLOY_DIR/celery-worker.service" /etc/systemd/system/
        sudo cp "$DEPLOY_DIR/celery-beat.service" /etc/systemd/system/

        # Reload systemd
        sudo systemctl daemon-reload

        echo "✓ Systemd services installed"
        echo ""
        echo "To enable and start services:"
        echo "  sudo systemctl enable celery-worker"
        echo "  sudo systemctl start celery-worker"
        echo ""
        echo "To manage services:"
        echo "  sudo systemctl status celery-worker"
        echo "  sudo systemctl stop celery-worker"
        echo "  sudo systemctl restart celery-worker"
        echo "  sudo journalctl -u celery-worker -f"
        echo ""
        ;;

    3)
        echo ""
        echo "=== Manual Setup ==="
        echo ""
        echo "Log directory created: $PROJECT_DIR/logs"
        echo ""
        echo "To start Celery worker manually:"
        echo "  cd $PROJECT_DIR"
        echo "  celery -A _main worker --loglevel=info --logfile=logs/celery-worker.log"
        echo ""
        echo "To run in background (tmux/screen):"
        echo "  tmux new -s celery -d 'cd $PROJECT_DIR && celery -A _main worker --loglevel=info'"
        echo ""
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo "Setup complete!"
