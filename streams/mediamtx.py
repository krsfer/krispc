"""
MediaMTX HTTP API client.

Talks to mediamtx-krispc.internal:9997/v3/ via httpx.
All functions are synchronous (suitable for Django views and Celery tasks).
"""
import httpx
from django.conf import settings

_BASE_URL = getattr(settings, "MEDIAMTX_URL", "http://mediamtx-krispc.internal:9997")
_TIMEOUT = 5.0


def _client() -> httpx.Client:
    return httpx.Client(base_url=_BASE_URL, timeout=_TIMEOUT)


def list_paths(page: int = 0, items_per_page: int = 100) -> dict:
    """List all active paths/streams (GET /v3/paths/list)."""
    with _client() as client:
        r = client.get("/v3/paths/list", params={"page": page, "itemsPerPage": items_per_page})
        r.raise_for_status()
        return r.json()


def get_path(name: str) -> dict:
    """Get details for a specific path (GET /v3/paths/get/{name})."""
    with _client() as client:
        r = client.get(f"/v3/paths/get/{name}")
        r.raise_for_status()
        return r.json()


def list_recordings(page: int = 0, items_per_page: int = 100) -> dict:
    """List all recordings (GET /v3/recordings/list)."""
    with _client() as client:
        r = client.get(
            "/v3/recordings/list",
            params={"page": page, "itemsPerPage": items_per_page},
        )
        r.raise_for_status()
        return r.json()


def get_recordings(name: str) -> dict:
    """Get recordings for a specific path (GET /v3/recordings/get/{name})."""
    with _client() as client:
        r = client.get(f"/v3/recordings/get/{name}")
        r.raise_for_status()
        return r.json()


def delete_recording_segment(path: str, start: str) -> None:
    """Delete a recording segment (DELETE /v3/recordings/deletesegment)."""
    with _client() as client:
        r = client.delete("/v3/recordings/deletesegment", params={"path": path, "start": start})
        r.raise_for_status()


def kick_rtsp_session(session_id: str) -> None:
    """Kick an active RTSP session (POST /v3/rtspsessions/kick/{id})."""
    with _client() as client:
        r = client.post(f"/v3/rtspsessions/kick/{session_id}")
        r.raise_for_status()
