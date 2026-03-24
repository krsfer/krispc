"""
Valkey-backed stream state cache.

Caches the MediaMTX paths list with a short TTL so views don't poll the
MediaMTX API on every request. Also publishes stream events for real-time
consumers via Valkey pub/sub.
"""
import json
import logging
from typing import Optional

import valkey
from django.conf import settings

logger = logging.getLogger(__name__)

_REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379")
_TTL = getattr(settings, "MEDIAMTX_STREAM_CACHE_TTL", 10)
_PREFIX = "krispc:streams"

_client: Optional[valkey.Valkey] = None


def _get_client() -> valkey.Valkey:
    global _client
    if _client is None:
        _client = valkey.Valkey.from_url(_REDIS_URL, decode_responses=True)
    return _client


def cache_stream_status(paths_data: dict) -> None:
    """Cache the full /v3/paths/list response for _TTL seconds."""
    _get_client().set(f"{_PREFIX}:all", json.dumps(paths_data), ex=_TTL)


def get_cached_stream_status() -> Optional[dict]:
    """Return the cached paths list, or None if expired/missing."""
    raw = _get_client().get(f"{_PREFIX}:all")
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Corrupt stream status cache entry — ignoring")
        return None


def publish_stream_event(event_type: str, path_name: str, extra: Optional[dict] = None) -> None:
    """Publish a stream lifecycle event to the pub/sub channel."""
    payload = json.dumps({"type": event_type, "path": path_name, **(extra or {})})
    _get_client().publish(f"{_PREFIX}:events", payload)
