from .settings import *

# Override CACHES to use LocMemCache for tests
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

# Disable rate limiting for tests if needed, or keep it to test logic
# We keep it but since we use LocMemCache, it won't fail on Redis connection
