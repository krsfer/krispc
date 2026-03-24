import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import cache, mediamtx
from .models import StreamConfig

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stream_list(request):
    """
    List active streams, serving from the Valkey cache when available.
    Falls back to a live MediaMTX query on cache miss.
    """
    data = cache.get_cached_stream_status()
    if data is None:
        try:
            data = mediamtx.list_paths()
            cache.cache_stream_status(data)
        except Exception as exc:
            logger.error("MediaMTX unreachable: %s", exc)
            return Response(
                {"error": "stream server unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    # Annotate live items with DB-side config (display name, record flag, etc.)
    configs = {c.name: c for c in StreamConfig.objects.filter(enabled=True)}
    items = data.get("items", [])
    for item in items:
        cfg = configs.get(item.get("name"))
        if cfg:
            item["display_name"] = cfg.display_name or cfg.name
            item["record"] = cfg.record
            item["description"] = cfg.description

    return Response({"items": items, "itemCount": data.get("itemCount", len(items))})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stream_detail(request, name: str):
    """Get live details for a specific stream path."""
    try:
        data = mediamtx.get_path(name)
    except Exception as exc:
        logger.error("MediaMTX error for path %s: %s", name, exc)
        return Response({"error": "stream not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recording_list(request):
    """List all recordings from MediaMTX."""
    try:
        data = mediamtx.list_recordings()
    except Exception as exc:
        logger.error("MediaMTX recordings unavailable: %s", exc)
        return Response(
            {"error": "stream server unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def recording_delete(request):
    """Queue deletion of a recording segment."""
    path = request.query_params.get("path")
    start = request.query_params.get("start")
    if not path or not start:
        return Response(
            {"error": "path and start query params are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    from .tasks import delete_recording

    delete_recording.delay(path, start)
    return Response({"queued": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def kick_session(request, session_id: str):
    """Kick an active RTSP session."""
    try:
        mediamtx.kick_rtsp_session(session_id)
    except Exception as exc:
        logger.error("Failed to kick session %s: %s", session_id, exc)
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"kicked": True})
