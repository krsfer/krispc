from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings
from django.core.mail import send_mail

from sas.models import SasAccessLog, SasFile


LOCAL_IPS = {"127.0.0.1", "::1", "localhost"}


def extract_client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("HTTP_CF_CONNECTING_IP") or request.META.get("REMOTE_ADDR")


def fetch_ipinfo_lite(ip_address: str | None) -> dict[str, Any]:
    if not ip_address or ip_address in LOCAL_IPS:
        return {}

    token = getattr(settings, "SAS_IPINFO_TOKEN", "")
    if not token:
        return {}

    try:
        response = requests.get(
            f"https://api.ipinfo.io/lite/{ip_address}",
            params={"token": token},
            timeout=5,
        )
        if response.status_code != 200:
            return {}
        data = response.json()
        if isinstance(data, dict):
            return data
    except Exception:
        return {}
    return {}


@dataclass
class Coordinates:
    latitude: float | None = None
    longitude: float | None = None


def parse_coordinates(payload: dict[str, Any]) -> Coordinates:
    if not payload:
        return Coordinates()

    lat = payload.get("latitude")
    lon = payload.get("longitude")

    if lat is not None and lon is not None:
        try:
            return Coordinates(float(lat), float(lon))
        except (TypeError, ValueError):
            return Coordinates()

    loc = payload.get("loc")
    if isinstance(loc, str) and "," in loc:
        left, right = loc.split(",", maxsplit=1)
        try:
            return Coordinates(float(left), float(right))
        except (TypeError, ValueError):
            return Coordinates()
    return Coordinates()


def build_ipinfo_curl(ip_address: str | None) -> str:
    token = getattr(settings, "SAS_IPINFO_TOKEN", "")
    if not ip_address:
        return ""
    return f"curl https://api.ipinfo.io/lite/{ip_address}?token={token}"


def send_access_email(
    *,
    share: SasFile,
    access_log: SasAccessLog,
    ipinfo_payload: dict[str, Any],
) -> None:
    recipient = getattr(settings, "SAS_ACCESS_EMAIL", "archer.chris@gmail.com")
    if not recipient:
        return

    status_label = "ALLOWED" if access_log.was_allowed else "BLOCKED"
    body_lines = [
        "SAS access event",
        "",
        f"Status: {status_label}",
        f"Reason: {access_log.reason or '-'}",
        f"Share ID: {share.pk}",
        f"File: {share.file.name}",
        f"Caption: {share.caption or '-'}",
        f"Downloads used: {share.download_count}/{share.MAX_DOWNLOADS}",
        f"Downloads remaining: {share.remaining_downloads}",
        "",
        "Request analytics",
        f"IP: {access_log.ip_address or '-'}",
        f"Method: {access_log.method or '-'}",
        f"Path: {access_log.path or '-'}",
        f"User-Agent: {access_log.user_agent or '-'}",
        f"Referrer: {access_log.referrer or '-'}",
        f"Accept-Language: {access_log.accept_language or '-'}",
        "",
        "Best-guess GeoIP",
        f"Latitude: {access_log.geo_latitude if access_log.geo_latitude is not None else '-'}",
        f"Longitude: {access_log.geo_longitude if access_log.geo_longitude is not None else '-'}",
        f"Raw payload: {ipinfo_payload or {}}",
        "",
        build_ipinfo_curl(access_log.ip_address),
        "",
        f"Total access attempts for this file: {share.access_logs.count()}",
    ]

    send_mail(
        subject=f"[sas.krispc.fr] access #{access_log.pk} ({status_label.lower()})",
        message="\n".join(body_lines),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=True,
    )
