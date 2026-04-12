import logging

from django.conf import settings

try:
    import valkey as redis_client
except ImportError:  # pragma: no cover - exercised in environments without valkey
    import redis as redis_client

# Cache for already established connections to prevent recursion
_redis_connection_cache = {}


def get_redis_connection():
    """
    Create a Redis/Valkey connection.
    Uses plain redis:// — no SSL needed on Fly private networking.
    """
    global _redis_connection_cache
    cache_key = "default"
    if cache_key in _redis_connection_cache:
        return _redis_connection_cache[cache_key]

    redis_url = settings.REDIS_URL
    logger = logging.getLogger("p2c")

    logger.info("Connecting to Redis/Valkey at %s", redis_url)
    if hasattr(redis_client, "Valkey"):
        conn = redis_client.Valkey.from_url(redis_url)
    else:
        conn = redis_client.Redis.from_url(redis_url)
    _redis_connection_cache[cache_key] = conn
    return conn
