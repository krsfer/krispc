import logging
import os
import ssl

import redis
from django.conf import settings

# Cache for already established connections to prevent recursion
_redis_connection_cache = {}


def get_redis_connection():
    """
    Create a Redis connection with proper SSL configuration or fallback to simpler options
    for development environments
    """
    # Check if we already have a connection in the cache
    global _redis_connection_cache
    cache_key = "default"
    if cache_key in _redis_connection_cache:
        return _redis_connection_cache[cache_key]

    redis_url = settings.REDIS_URL
    logger = logging.getLogger("p2c")

    # Simple connection attempt for local development
    if "localhost" in redis_url or "127.0.0.1" in redis_url:
        logger.info("Connecting to local Redis instance")
        conn = redis.Redis.from_url(redis_url)
        _redis_connection_cache[cache_key] = conn
        return conn

    # For Redis Cloud, try to connect with SSL if certificates exist
    try:
        # First verify that the certificate files exist
        cert_files_exist = (
            hasattr(settings, "REDIS_CA_CERT_PATH")
            and os.path.exists(settings.REDIS_CA_CERT_PATH)
            and hasattr(settings, "REDIS_CLIENT_CERT_PATH")
            and os.path.exists(settings.REDIS_CLIENT_CERT_PATH)
            and hasattr(settings, "REDIS_CLIENT_KEY_PATH")
            and os.path.exists(settings.REDIS_CLIENT_KEY_PATH)
        )

        if cert_files_exist:
            # Full SSL connection with certificates for Redis Cloud
            logger.info("Connecting to Redis Cloud with TLS certificates")
            ssl_params = {
                "ssl_cert_reqs": ssl.CERT_REQUIRED,
                "ssl_ca_certs": settings.REDIS_CA_CERT_PATH,
                "ssl_certfile": settings.REDIS_CLIENT_CERT_PATH,
                "ssl_keyfile": settings.REDIS_CLIENT_KEY_PATH,
            }

            # Make sure redis_url uses rediss:// protocol
            if redis_url.startswith("redis://"):
                redis_url = redis_url.replace("redis://", "rediss://", 1)

            # Create the connection directly (don't use Redis.from_url to avoid potential recursion)
            conn = redis.Redis.from_url(redis_url, **ssl_params)
            _redis_connection_cache[cache_key] = conn
            return conn
        else:
            # SSL connection without certificate verification
            logger.warning("Certificate files not found. Connecting with minimal SSL")
            if redis_url.startswith("redis://"):
                redis_url = redis_url.replace("redis://", "rediss://", 1)
            conn = redis.Redis.from_url(redis_url, ssl_cert_reqs=None)
            _redis_connection_cache[cache_key] = conn
            return conn

    except Exception as e:
        logger.error(f"Error connecting to Redis with SSL: {str(e)}")
        # Last resort - try connecting without SSL parameters
        try:
            # For Redis 5.x, SSL might be handled automatically by the URL scheme (rediss://)
            logger.info("Attempting fallback connection using URL scheme only")
            if redis_url.startswith("redis://"):
                redis_url = redis_url.replace("redis://", "rediss://", 1)
            conn = redis.Redis.from_url(redis_url)
            _redis_connection_cache[cache_key] = conn
            return conn
        except Exception as inner_e:
            logger.error(f"All Redis connection attempts failed: {str(inner_e)}")
            # Re-raise the original exception if all attempts fail
            raise e
