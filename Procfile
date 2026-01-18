# Django migrations are run as part of app deployment:
release: ./manage.py migrate --no-input

# Daphne receives web traffic, handling HTTP and WebSocket requests.
web: daphne _main.asgi:application --port $PORT --bind 0.0.0.0 -v2

# Background worker for processing tasks
worker: python manage.py runworker channel_layer -v2
