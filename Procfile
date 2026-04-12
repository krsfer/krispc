# Django migrations are run as part of app deployment:
release: ./manage.py migrate --no-input

# Gunicorn binds the port immediately while uvicorn workers serve ASGI/WebSocket traffic.
web: gunicorn -k uvicorn.workers.UvicornWorker _main.asgi:application --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1}

# Background worker for processing tasks
worker: python manage.py runworker channel_layer -v2
