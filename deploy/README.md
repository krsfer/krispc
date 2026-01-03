# Celery Worker Service Setup

Production-ready configurations for running Celery workers as background services.

## Quick Start

Run the interactive setup script:

```bash
cd ~/dev/src/py/krispcBase/deploy
./setup-celery-service.sh
```

## Option 1: Supervisord (Recommended for Development/macOS)

### Install Supervisord

```bash
pip install supervisor
```

### Start Services

```bash
cd ~/dev/src/py/krispcBase
supervisord -c supervisord.conf
```

### Manage Workers

```bash
# Check status
supervisorctl -c supervisord.conf status

# Start/stop/restart
supervisorctl -c supervisord.conf start celery-worker
supervisorctl -c supervisord.conf stop celery-worker
supervisorctl -c supervisord.conf restart celery-worker

# View logs in real-time
supervisorctl -c supervisord.conf tail -f celery-worker

# Stop supervisord completely
supervisorctl -c supervisord.conf shutdown
```

### View Logs

```bash
tail -f logs/celery-worker.log
tail -f logs/celery-worker-error.log
```

## Option 2: Systemd (Linux Production)

### Install Services

```bash
# Run the setup script and choose option 2
cd ~/dev/src/py/krispcBase/deploy
./setup-celery-service.sh
```

Or manually:

```bash
# Create directories
sudo mkdir -p /var/log/celery /var/run/celery
sudo chown -R $USER:$USER /var/log/celery /var/run/celery

# Install service files
sudo cp celery-worker.service /etc/systemd/system/
sudo cp celery-beat.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### Start Services

```bash
# Enable auto-start on boot
sudo systemctl enable celery-worker
sudo systemctl enable celery-beat

# Start services
sudo systemctl start celery-worker
sudo systemctl start celery-beat
```

### Manage Services

```bash
# Check status
sudo systemctl status celery-worker
sudo systemctl status celery-beat

# View logs
sudo journalctl -u celery-worker -f
sudo journalctl -u celery-beat -f

# Restart after code changes
sudo systemctl restart celery-worker

# Stop services
sudo systemctl stop celery-worker
sudo systemctl stop celery-beat
```

## Testing the Worker

Once the worker is running, verify it's working:

```bash
# Check worker is responding
celery -A _main inspect ping

# Check registered tasks
celery -A _main inspect registered

# Check active tasks
celery -A _main inspect active

# Check worker stats
celery -A _main inspect stats
```

## Troubleshooting

### Worker not starting

1. Check logs:
   ```bash
   # Supervisord
   cat logs/celery-worker-error.log

   # Systemd
   sudo journalctl -u celery-worker -n 50
   ```

2. Verify Redis connection:
   ```bash
   redis-cli -h <your-redis-host> ping
   ```

3. Test manually:
   ```bash
   cd ~/dev/src/py/krispcBase
   celery -A _main worker --loglevel=debug
   ```

### Tasks still pending

1. Ensure worker is running:
   ```bash
   celery -A _main inspect ping
   ```

2. Check task is registered:
   ```bash
   celery -A _main inspect registered | grep delete_events_task
   ```

3. Check Redis queue:
   ```bash
   redis-cli -h <your-redis-host>
   KEYS celery*
   ```

### After code changes

Always restart the worker after changing task code:

```bash
# Supervisord
supervisorctl -c supervisord.conf restart celery-worker

# Systemd
sudo systemctl restart celery-worker
```

## Configuration Details

### Worker Concurrency

Default: 4 workers. Adjust based on your workload:

- **Supervisord**: Edit `deploy/supervisord-celery.conf`, change `--concurrency=4`
- **Systemd**: Edit `/etc/systemd/system/celery-worker.service`, change `--concurrency=4`

### Log Levels

Available levels: `debug`, `info`, `warning`, `error`, `critical`

Change `--loglevel=info` to desired level in the service configuration.

## Production Recommendations

1. **Use supervisord for macOS development**
2. **Use systemd for Linux production**
3. **Monitor worker health** - set up alerts if worker goes down
4. **Log rotation** - configure logrotate to prevent disk space issues
5. **Resource limits** - monitor CPU/memory usage and adjust concurrency
6. **Autoscaling** - consider adding more workers during peak times

## Files Created

- `deploy/supervisord-celery.conf` - Supervisord configuration
- `deploy/celery-worker.service` - Systemd worker service
- `deploy/celery-beat.service` - Systemd beat service (scheduler)
- `deploy/setup-celery-service.sh` - Interactive setup script
- `supervisord.conf` - Main supervisord config (created by setup script)
- `logs/` - Log directory
