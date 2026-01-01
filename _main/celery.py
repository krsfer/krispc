import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "_main.settings")

app = Celery("p2c")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Explicitly set broker and backend SSL configuration
from django.conf import settings

if hasattr(settings, "CELERY_BROKER_USE_SSL"):
    app.conf.broker_use_ssl = settings.CELERY_BROKER_USE_SSL
if hasattr(settings, "CELERY_REDIS_BACKEND_USE_SSL"):
    app.conf.redis_backend_use_ssl = settings.CELERY_REDIS_BACKEND_USE_SSL

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()
