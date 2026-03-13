import tomllib
from pathlib import Path


def load_fly_config():
    return tomllib.loads(Path("fly.toml").read_text())


def test_fly_app_process_uses_startup_script():
    config = load_fly_config()

    assert config["processes"]["app"] == "./start-fly-app.sh"


def test_fly_app_process_keeps_migrations_out_of_listener_command():
    config = load_fly_config()
    app_command = config["processes"]["app"]

    assert "manage.py migrate" not in app_command
    assert "manage.py enable_wal" not in app_command
    assert "daphne" not in app_command


def test_fly_env_configures_readiness_file():
    config = load_fly_config()

    assert config["env"]["KRISPC_READY_FILE"] == "/tmp/krispc-ready"


def test_startup_script_waits_for_daphne_before_other_services():
    script = Path("start-fly-app.sh").read_text()

    daphne_start = script.index('start_background daphne')
    daphne_wait = script.index('wait_for_port 127.0.0.1 "$APP_PORT" 30 "Daphne"')
    next_start = script.index('start_background_shell "cd /app/apps/emoty_web && npm run start"')
    worker_start = script.index('start_background celery -A _main worker -l info')

    assert daphne_start < daphne_wait < next_start < worker_start
