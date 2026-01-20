# p2c/celery_progress_config.py
# Create this file in your app directory

from django.conf import settings

# Use the same Redis connection settings for celery_progress
CELERY_PROGRESS_BROKER_URL = settings.REDIS_URL
CELERY_PROGRESS_BROKER_USE_SSL = settings.REDIS_SSL_OPTIONS
