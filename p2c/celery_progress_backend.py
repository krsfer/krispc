import redis
from celery_progress.backend import Progress, ProgressRecorder


# This will be imported by our __init__.py to ensure the patch is applied
def apply_redis_patch():
    """Function to ensure Redis uses secure connections"""
    # We no longer need to monkey patch since our connection handling is in redis_connection.py
    pass
