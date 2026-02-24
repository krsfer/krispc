from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.db import transaction
from django.db.models import F
from django.http import FileResponse, HttpResponse, HttpResponseBadRequest, HttpResponseNotAllowed
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from sas.forms import DownloadChallengeForm, SasUploadForm
from sas.models import SasAccessLog, SasFile
from sas.services import extract_client_ip, fetch_ipinfo_lite, parse_coordinates, send_access_email


def is_staff_user(user):
    return user.is_authenticated and user.is_staff


def _active_share():
    return SasFile.objects.filter(is_active=True).order_by("-created_at").first()


def _build_context(request, *, download_form=None, upload_form=None):
    return {
        "active_share": _active_share(),
        "download_form": download_form or DownloadChallengeForm(),
        "upload_form": upload_form or (SasUploadForm() if is_staff_user(request.user) else None),
    }


def index(request):
    return render(request, "sas/index.html", _build_context(request))


@user_passes_test(is_staff_user)
def upload(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    form = SasUploadForm(request.POST, request.FILES)
    if not form.is_valid():
        context = _build_context(request, upload_form=form)
        return render(request, "sas/index.html", context, status=400)

    share = form.save(commit=False)
    share.created_by = request.user
    share.download_count = 0
    share.is_active = True
    share.save()
    SasFile.objects.exclude(pk=share.pk).update(is_active=False)

    messages.success(request, "File uploaded successfully.")
    return redirect(reverse("sas:index"))


def download(request, share_id):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    share = get_object_or_404(SasFile, pk=share_id, is_active=True)
    form = DownloadChallengeForm(request.POST)

    client_ip = extract_client_ip(request)
    ipinfo_payload = fetch_ipinfo_lite(client_ip)
    coordinates = parse_coordinates(ipinfo_payload)

    if not form.is_valid():
        access_log = SasAccessLog.objects.create(
            share=share,
            ip_address=client_ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            referrer=request.META.get("HTTP_REFERER", ""),
            accept_language=request.META.get("HTTP_ACCEPT_LANGUAGE", ""),
            method=request.method,
            path=request.path,
            was_allowed=False,
            reason="turnstile_failed",
            geo_latitude=coordinates.latitude,
            geo_longitude=coordinates.longitude,
            geo_payload=ipinfo_payload,
        )
        send_access_email(share=share, access_log=access_log, ipinfo_payload=ipinfo_payload)
        return HttpResponseBadRequest("Turnstile validation failed.")

    with transaction.atomic():
        updated = SasFile.objects.filter(
            pk=share.pk,
            is_active=True,
            download_count__lt=SasFile.MAX_DOWNLOADS,
        ).update(download_count=F("download_count") + 1)

    share.refresh_from_db()
    if updated != 1:
        access_log = SasAccessLog.objects.create(
            share=share,
            ip_address=client_ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            referrer=request.META.get("HTTP_REFERER", ""),
            accept_language=request.META.get("HTTP_ACCEPT_LANGUAGE", ""),
            method=request.method,
            path=request.path,
            was_allowed=False,
            reason="download_limit_reached",
            geo_latitude=coordinates.latitude,
            geo_longitude=coordinates.longitude,
            geo_payload=ipinfo_payload,
        )
        send_access_email(share=share, access_log=access_log, ipinfo_payload=ipinfo_payload)
        return HttpResponse("Download limit reached.", status=429)

    access_log = SasAccessLog.objects.create(
        share=share,
        ip_address=client_ip,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        referrer=request.META.get("HTTP_REFERER", ""),
        accept_language=request.META.get("HTTP_ACCEPT_LANGUAGE", ""),
        method=request.method,
        path=request.path,
        was_allowed=True,
        reason="ok",
        geo_latitude=coordinates.latitude,
        geo_longitude=coordinates.longitude,
        geo_payload=ipinfo_payload,
    )
    send_access_email(share=share, access_log=access_log, ipinfo_payload=ipinfo_payload)

    filename = share.file.name.rsplit("/", maxsplit=1)[-1]
    return FileResponse(share.file.open("rb"), as_attachment=True, filename=filename)
