from __future__ import annotations

import ipaddress
import logging
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.cache import caches
from django.core.mail import send_mail

from sas.models import SasAccessLog, SasFile


logger = logging.getLogger(__name__)

LOCAL_IPS = {"127.0.0.1", "::1", "localhost"}
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
SECURITY_CACHE_CONTROL = "no-store, no-cache, must-revalidate"
SECURITY_ROBOTS_TAG = "noindex, nofollow"


@dataclass(frozen=True)
class TurnstileValidationResult:
    is_valid: bool
    success: bool
    hostname: str
    action: str
    error_codes: list[str]
    error: str


@dataclass
class Coordinates:
    latitude: float | None = None
    longitude: float | None = None


def _clean_ip(candidate: str | None) -> str | None:
    if not candidate:
        return None
    try:
        return str(ipaddress.ip_address(candidate.strip()))
    except ValueError:
        return None


def extract_client_ip(request) -> str | None:
    fly_client_ip = _clean_ip(request.META.get("HTTP_FLY_CLIENT_IP"))
    if fly_client_ip:
        return fly_client_ip

    if getattr(settings, "SAS_TRUST_CF_CONNECTING_IP", False):
        cf_connecting_ip = _clean_ip(request.META.get("HTTP_CF_CONNECTING_IP"))
        if cf_connecting_ip:
            return cf_connecting_ip

    remote_addr = _clean_ip(request.META.get("REMOTE_ADDR"))
    trusted_proxy_ips = set(getattr(settings, "SAS_TRUSTED_PROXY_IPS", []))
    if remote_addr and remote_addr in trusted_proxy_ips:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        first_hop = forwarded.split(",", maxsplit=1)[0].strip() if forwarded else ""
        forwarded_ip = _clean_ip(first_hop)
        if forwarded_ip:
            return forwarded_ip

    return remote_addr


def _default_turnstile_hostnames() -> set[str]:
    configured = set(getattr(settings, "SAS_TURNSTILE_EXPECTED_HOSTNAMES", []) or [])
    if configured:
        return configured

    sas_base_url = getattr(settings, "SAS_BASE_URL", "")
    parsed = urlparse(sas_base_url)
    if parsed.hostname:
        return {parsed.hostname}
    return {"sas.krispc.fr"}


def validate_turnstile_token(token: str | None, *, remote_ip: str | None) -> TurnstileValidationResult:
    expected_action = getattr(settings, "SAS_TURNSTILE_EXPECTED_ACTION", "sas_download")
    expected_hostnames = _default_turnstile_hostnames()

    if not token:
        return TurnstileValidationResult(
            is_valid=False,
            success=False,
            hostname="",
            action="",
            error_codes=["missing-input-response"],
            error="missing_token",
        )

    payload = {
        "secret": getattr(settings, "TURNSTILE_SECRET", ""),
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        response = requests.post(TURNSTILE_VERIFY_URL, data=payload, timeout=5)
    except requests.Timeout:
        return TurnstileValidationResult(
            is_valid=False,
            success=False,
            hostname="",
            action="",
            error_codes=["timeout"],
            error="timeout",
        )
    except requests.RequestException as exc:
        return TurnstileValidationResult(
            is_valid=False,
            success=False,
            hostname="",
            action="",
            error_codes=["request_error"],
            error=f"request_error:{exc.__class__.__name__}",
        )

    if response.status_code != 200:
        status_error = f"http_{response.status_code}"
        return TurnstileValidationResult(
            is_valid=False,
            success=False,
            hostname="",
            action="",
            error_codes=[status_error],
            error=status_error,
        )

    try:
        body = response.json()
    except ValueError:
        return TurnstileValidationResult(
            is_valid=False,
            success=False,
            hostname="",
            action="",
            error_codes=["parse_error"],
            error="parse_error",
        )

    success = bool(body.get("success"))
    hostname = str(body.get("hostname", "") or "")
    action = str(body.get("action", "") or "")
    raw_errors = body.get("error-codes") or []
    error_codes: list[str] = [str(code) for code in raw_errors if code]

    if success and hostname not in expected_hostnames:
        error_codes.append("hostname_mismatch")
    if success and action != expected_action:
        error_codes.append("action_mismatch")

    is_valid = success and hostname in expected_hostnames and action == expected_action
    return TurnstileValidationResult(
        is_valid=is_valid,
        success=success,
        hostname=hostname,
        action=action,
        error_codes=error_codes,
        error="" if is_valid else ",".join(error_codes),
    )


def fetch_ipinfo_lite(ip_address: str | None) -> tuple[dict[str, Any], str]:
    if not ip_address or ip_address in LOCAL_IPS:
        return {}, ""

    token = getattr(settings, "SAS_IPINFO_TOKEN", "")
    if not token:
        return {}, ""

    timeout_seconds = int(getattr(settings, "SAS_IPINFO_TIMEOUT_SECONDS", 2))

    try:
        response = requests.get(
            f"https://api.ipinfo.io/lite/{ip_address}",
            params={"token": token},
            timeout=timeout_seconds,
        )
    except requests.Timeout:
        return {}, "timeout"
    except requests.RequestException as exc:
        return {}, f"request_error:{exc.__class__.__name__}"

    if response.status_code != 200:
        return {}, f"http_{response.status_code}"

    try:
        data = response.json()
    except ValueError:
        return {}, "parse_error"

    if not isinstance(data, dict):
        return {}, "parse_error"
    return data, ""


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
    if not ip_address:
        return ""
    token = getattr(settings, "SAS_IPINFO_TOKEN", "")
    if not token:
        return f"curl https://api.ipinfo.io/lite/{ip_address}"
    return f"curl https://api.ipinfo.io/lite/{ip_address}?token=***REDACTED***"


def send_access_email(
    *,
    share: SasFile,
    access_log: SasAccessLog,
    ipinfo_payload: dict[str, Any],
) -> tuple[bool, str]:
    recipient = getattr(settings, "SAS_ACCESS_EMAIL", "archer.chris@gmail.com")
    if not recipient:
        return False, "missing_recipient"

    status_label = "ALLOWED" if access_log.was_allowed else "BLOCKED"
    body_lines = [
        "SAS access event",
        "",
        f"Status: {status_label}",
        f"Reason: {access_log.reason or '-'}",
        f"Share ID: {share.pk}",
        f"Share UUID: {share.download_uuid}",
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
        "Turnstile verification",
        f"Success: {access_log.turnstile_success}",
        f"Hostname: {access_log.turnstile_hostname or '-'}",
        f"Action: {access_log.turnstile_action or '-'}",
        f"Error codes: {access_log.turnstile_error_codes or []}",
        "",
        "Best-guess GeoIP",
        f"Latitude: {access_log.geo_latitude if access_log.geo_latitude is not None else '-'}",
        f"Longitude: {access_log.geo_longitude if access_log.geo_longitude is not None else '-'}",
        f"Raw payload: {ipinfo_payload or {}}",
        f"IPinfo error: {access_log.ipinfo_error or '-'}",
        "",
        build_ipinfo_curl(access_log.ip_address),
        "",
        f"Total access attempts for this file: {share.access_logs.count()}",
    ]

    try:
        send_mail(
            subject=f"[sas.krispc.fr] access #{access_log.pk} ({status_label.lower()})",
            message="\n".join(body_lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
    except Exception as exc:  # pragma: no cover - exercised via mocks in tests
        return False, f"{exc.__class__.__name__}: {exc}"
    return True, ""


def is_rate_limited(ip_address: str | None) -> tuple[bool, str]:
    if not ip_address:
        return False, ""

    cache_alias = getattr(settings, "SAS_RATE_LIMIT_CACHE_ALIAS", "default")
    limit = int(getattr(settings, "SAS_RATE_LIMIT_REQUESTS", 5))
    window_seconds = int(getattr(settings, "SAS_RATE_LIMIT_WINDOW_SECONDS", 60))
    cache_key = f"sas:download-rate:{ip_address}"

    try:
        cache = caches[cache_alias]
        if cache.add(cache_key, 1, timeout=window_seconds):
            return False, ""

        current = cache.incr(cache_key)
        if current > limit:
            return True, ""
    except Exception as exc:
        logger.warning(
            "sas_rate_limit_fail_open",
            extra={
                "sas_access": {
                    "ip_address": ip_address,
                    "error": f"{exc.__class__.__name__}: {exc}",
                }
            },
        )
        return False, f"rate_limit_error:{exc.__class__.__name__}"
    return False, ""


def apply_security_headers(response):
    response["Cache-Control"] = SECURITY_CACHE_CONTROL
    response["X-Robots-Tag"] = SECURITY_ROBOTS_TAG
    return response
