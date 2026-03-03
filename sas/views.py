import logging

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.db import transaction
from django.db.models import F
from django.http import FileResponse, HttpResponse, HttpResponseBadRequest, HttpResponseNotAllowed
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from sas.forms import DownloadChallengeForm, SasUploadForm
from sas.models import SasAccessLog, SasFile
from sas.services import (
    apply_security_headers,
    extract_client_ip,
    fetch_ipinfo_lite,
    is_rate_limited,
    parse_coordinates,
    send_access_email,
    validate_turnstile_token,
)


logger = logging.getLogger(__name__)


def is_staff_user(user):
    return user.is_authenticated and user.is_staff


def _active_share():
    return SasFile.objects.filter(is_active=True).order_by("-created_at").first()


def _build_context(request, *, download_form=None, upload_form=None):
    return {
        "active_share": _active_share(),
        "download_form": download_form or DownloadChallengeForm(),
        "upload_form": upload_form or (SasUploadForm() if is_staff_user(request.user) else None),
        "turnstile_sitekey": getattr(settings, "TURNSTILE_SITEKEY", ""),
        "turnstile_action": getattr(settings, "SAS_TURNSTILE_EXPECTED_ACTION", "sas_download"),
    }


def _create_access_log(
    *,
    share: SasFile,
    request,
    ip_address: str | None,
    was_allowed: bool,
    reason: str,
    geo_payload: dict,
    geo_latitude: float | None,
    geo_longitude: float | None,
    ipinfo_error: str,
    turnstile_success: bool | None,
    turnstile_error_codes: list[str] | None,
    turnstile_hostname: str,
    turnstile_action: str,
    rate_limit_error: str,
) -> SasAccessLog:
    access_log = SasAccessLog.objects.create(
        share=share,
        ip_address=ip_address,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        referrer=request.META.get("HTTP_REFERER", ""),
        accept_language=request.META.get("HTTP_ACCEPT_LANGUAGE", ""),
        method=request.method,
        path=request.path,
        was_allowed=was_allowed,
        reason=reason,
        turnstile_success=turnstile_success,
        turnstile_error_codes=turnstile_error_codes or [],
        turnstile_hostname=turnstile_hostname or "",
        turnstile_action=turnstile_action or "",
        geo_latitude=geo_latitude,
        geo_longitude=geo_longitude,
        geo_payload=geo_payload,
        ipinfo_error=ipinfo_error or "",
    )
    email_sent, email_error = send_access_email(share=share, access_log=access_log, ipinfo_payload=geo_payload)
    access_log.email_sent = email_sent
    access_log.email_error = email_error
    access_log.save(update_fields=["email_sent", "email_error"])

    logger.info(
        "sas_access_attempt",
        extra={
            "sas_access": {
                "file_id": share.pk,
                "file_uuid": str(share.download_uuid),
                "access_log_id": access_log.pk,
                "was_allowed": access_log.was_allowed,
                "reason": access_log.reason,
                "ip_address": access_log.ip_address,
                "method": access_log.method,
                "path": access_log.path,
                "turnstile_success": access_log.turnstile_success,
                "turnstile_hostname": access_log.turnstile_hostname,
                "turnstile_action": access_log.turnstile_action,
                "turnstile_error_codes": access_log.turnstile_error_codes,
                "ipinfo_error": access_log.ipinfo_error,
                "email_sent": access_log.email_sent,
                "email_error": access_log.email_error,
                "rate_limit_error": rate_limit_error,
            }
        },
    )

    return access_log


def _turnstile_token_from_request(request) -> str | None:
    return (
        request.POST.get("cf-turnstile-response")
        or request.POST.get("turnstile")
        or request.POST.get("token")
    )


def index(request):
    response = render(request, "sas/index.html", _build_context(request))
    return apply_security_headers(response)


@user_passes_test(is_staff_user)
def upload(request):
    if request.method != "POST":
        return apply_security_headers(HttpResponseNotAllowed(["POST"]))

    form = SasUploadForm(request.POST, request.FILES)
    if not form.is_valid():
        context = _build_context(request, upload_form=form)
        response = render(request, "sas/index.html", context, status=400)
        return apply_security_headers(response)

    share = form.save(commit=False)
    share.created_by = request.user
    share.download_count = 0
    share.is_active = True
    share.save()
    SasFile.objects.exclude(pk=share.pk).update(is_active=False)

    messages.success(request, "File uploaded successfully.")
    response = redirect(reverse("sas:index"))
    return apply_security_headers(response)


def download(request, share_uuid):
    if request.method != "POST":
        return apply_security_headers(HttpResponseNotAllowed(["POST"]))

    share = get_object_or_404(SasFile, download_uuid=share_uuid, is_active=True)
    client_ip = extract_client_ip(request)
    rate_limited, rate_limit_error = is_rate_limited(client_ip)
    ipinfo_payload, ipinfo_error = fetch_ipinfo_lite(client_ip)
    coordinates = parse_coordinates(ipinfo_payload)

    if rate_limited:
        _create_access_log(
            share=share,
            request=request,
            ip_address=client_ip,
            was_allowed=False,
            reason="rate_limited",
            geo_payload=ipinfo_payload,
            geo_latitude=coordinates.latitude,
            geo_longitude=coordinates.longitude,
            ipinfo_error=ipinfo_error,
            turnstile_success=None,
            turnstile_error_codes=[],
            turnstile_hostname="",
            turnstile_action="",
            rate_limit_error=rate_limit_error,
        )
        return apply_security_headers(HttpResponse("Too many requests.", status=429))

    turnstile = validate_turnstile_token(_turnstile_token_from_request(request), remote_ip=client_ip)
    if not turnstile.is_valid:
        _create_access_log(
            share=share,
            request=request,
            ip_address=client_ip,
            was_allowed=False,
            reason="turnstile_failed",
            geo_payload=ipinfo_payload,
            geo_latitude=coordinates.latitude,
            geo_longitude=coordinates.longitude,
            ipinfo_error=ipinfo_error,
            turnstile_success=turnstile.success,
            turnstile_error_codes=turnstile.error_codes,
            turnstile_hostname=turnstile.hostname,
            turnstile_action=turnstile.action,
            rate_limit_error=rate_limit_error,
        )
        return apply_security_headers(HttpResponseBadRequest("Turnstile validation failed."))

    with transaction.atomic():
        updated = SasFile.objects.filter(
            pk=share.pk,
            is_active=True,
            download_count__lt=SasFile.MAX_DOWNLOADS,
        ).update(download_count=F("download_count") + 1)

    share.refresh_from_db()
    if updated != 1:
        _create_access_log(
            share=share,
            request=request,
            ip_address=client_ip,
            was_allowed=False,
            reason="download_limit_reached",
            geo_payload=ipinfo_payload,
            geo_latitude=coordinates.latitude,
            geo_longitude=coordinates.longitude,
            ipinfo_error=ipinfo_error,
            turnstile_success=turnstile.success,
            turnstile_error_codes=turnstile.error_codes,
            turnstile_hostname=turnstile.hostname,
            turnstile_action=turnstile.action,
            rate_limit_error=rate_limit_error,
        )
        return apply_security_headers(HttpResponse("Download limit reached.", status=429))

    _create_access_log(
        share=share,
        request=request,
        ip_address=client_ip,
        was_allowed=True,
        reason="ok",
        geo_payload=ipinfo_payload,
        geo_latitude=coordinates.latitude,
        geo_longitude=coordinates.longitude,
        ipinfo_error=ipinfo_error,
        turnstile_success=turnstile.success,
        turnstile_error_codes=turnstile.error_codes,
        turnstile_hostname=turnstile.hostname,
        turnstile_action=turnstile.action,
        rate_limit_error=rate_limit_error,
    )

    filename = share.file.name.rsplit("/", maxsplit=1)[-1]
    response = FileResponse(share.file.open("rb"), as_attachment=True, filename=filename)
    return apply_security_headers(response)
