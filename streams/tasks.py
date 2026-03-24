import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def refresh_stream_cache():
    """Poll MediaMTX and refresh the Valkey stream status cache.

    Runs every MEDIAMTX_STREAM_CACHE_TTL seconds via Celery Beat.
    Silently skips when MediaMTX is unreachable (not yet deployed, maintenance, etc.)
    — no retry needed since beat will reschedule automatically.
    """
    from . import cache, mediamtx

    try:
        data = mediamtx.list_paths()
        cache.cache_stream_status(data)
        cache.publish_stream_event("cache_refreshed", "*", {"count": data.get("itemCount", 0)})
    except Exception as exc:
        logger.debug("MediaMTX unreachable, skipping cache refresh: %s", exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def delete_recording(self, path: str, start: str):
    """Delete a MediaMTX recording segment asynchronously."""
    from . import mediamtx

    try:
        mediamtx.delete_recording_segment(path, start)
        logger.info("Deleted recording segment: path=%s start=%s", path, start)
    except Exception as exc:
        logger.warning("Failed to delete recording segment path=%s start=%s: %s", path, start, exc)
        raise self.retry(exc=exc)
