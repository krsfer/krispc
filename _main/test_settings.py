from .settings import *

# Override CACHES to use LocMemCache for tests
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

# Use simple static files storage for tests (avoids WhiteNoise manifest errors)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Ensure throttles are defined for tests
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    "anon": "1000/hour",
    "user": "1000/hour",
    "contacts": "100/minute",  # Higher limit for tests
    "read_only": "100/minute",
}