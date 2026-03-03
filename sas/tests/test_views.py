from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from sas.models import SasAccessLog, SasFile
from sas.services import TurnstileValidationResult


def _turnstile_ok() -> TurnstileValidationResult:
    return TurnstileValidationResult(
        is_valid=True,
        success=True,
        hostname="sas.krispc.fr",
        action="sas_download",
        error_codes=[],
        error="",
    )


def _turnstile_mismatch() -> TurnstileValidationResult:
    return TurnstileValidationResult(
        is_valid=False,
        success=True,
        hostname="evil.example",
        action="unexpected_action",
        error_codes=["hostname_mismatch", "action_mismatch"],
        error="",
    )


@pytest.fixture
def staff_user(django_user_model):
    return django_user_model.objects.create_superuser(
        username="sas-admin",
        email="admin@example.com",
        password="password123",
    )


@pytest.fixture
def staff_client(client, staff_user):
    client.force_login(staff_user)
    return client


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
def test_public_page_exposes_uuid_route_and_hardening_headers(client):
    share = SasFile.objects.create(
        caption="Demo caption",
        file=SimpleUploadedFile("demo.txt", b"hello world"),
    )

    response = client.get("/", HTTP_HOST="sas.krispc.fr")

    assert response.status_code == 200
    assert response.context["active_share"].pk == share.pk
    assert f"/download/{share.download_uuid}/" in response.content.decode()
    assert response["Cache-Control"] == "no-store, no-cache, must-revalidate"
    assert response["X-Robots-Tag"] == "noindex, nofollow"


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
def test_staff_upload_resets_counter_sets_new_active_file_and_keeps_uuid(staff_client):
    old = SasFile.objects.create(
        caption="Old file",
        file=SimpleUploadedFile("old.txt", b"old"),
        download_count=2,
        is_active=True,
    )

    response = staff_client.post(
        "/upload/",
        data={
            "caption": "Release candidate",
            "file": SimpleUploadedFile("release.txt", b"release payload"),
        },
        HTTP_HOST="sas.krispc.fr",
        follow=True,
    )

    assert response.status_code == 200

    old.refresh_from_db()
    created = SasFile.objects.get(caption="Release candidate")
    assert old.is_active is False
    assert created.is_active is True
    assert created.download_count == 0
    assert created.download_uuid is not None


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
@patch("sas.views.send_access_email", return_value=(True, ""))
@patch(
    "sas.views.fetch_ipinfo_lite",
    return_value=(
        {
            "ip": "8.8.8.8",
            "latitude": 37.386,
            "longitude": -122.0838,
            "country_code": "US",
        },
        "",
    ),
)
@patch("sas.views.validate_turnstile_token")
def test_successful_download_increments_counter_logs_structured_fields_and_sets_headers(
    mock_validate_turnstile,
    _mock_fetch_ipinfo,
    _mock_send_access_email,
    client,
    caplog,
):
    mock_validate_turnstile.return_value = _turnstile_ok()
    share = SasFile.objects.create(
        caption="Download me",
        file=SimpleUploadedFile("payload.txt", b"payload"),
    )

    with caplog.at_level("INFO"):
        response = client.post(
            f"/download/{share.download_uuid}/",
            data={"cf-turnstile-response": "challenge-token"},
            HTTP_HOST="sas.krispc.fr",
            HTTP_FLY_CLIENT_IP="8.8.8.8",
            HTTP_USER_AGENT="curl/8.0.1",
            HTTP_REFERER="https://hub.krispc.fr/",
            HTTP_ACCEPT_LANGUAGE="en-US,en;q=0.9",
        )

    assert response.status_code == 200
    assert "attachment;" in response["Content-Disposition"]
    assert response["Cache-Control"] == "no-store, no-cache, must-revalidate"
    assert response["X-Robots-Tag"] == "noindex, nofollow"

    share.refresh_from_db()
    assert share.download_count == 1

    log = SasAccessLog.objects.get(share=share)
    assert log.was_allowed is True
    assert log.reason == "ok"
    assert log.ip_address == "8.8.8.8"
    assert log.turnstile_success is True
    assert log.turnstile_hostname == "sas.krispc.fr"
    assert log.turnstile_action == "sas_download"
    assert log.turnstile_error_codes == []
    assert log.ipinfo_error == ""
    assert log.email_sent is True
    assert log.email_error == ""

    structured = [record for record in caplog.records if hasattr(record, "sas_access")]
    assert structured, "Expected structured SAS access logs in logger records"
    assert structured[-1].sas_access["reason"] == "ok"
    assert structured[-1].sas_access["was_allowed"] is True


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
@patch("sas.views.send_access_email", return_value=(True, ""))
@patch("sas.views.fetch_ipinfo_lite", return_value=({"ip": "1.1.1.1"}, ""))
@patch("sas.views.validate_turnstile_token")
def test_turnstile_hostname_action_mismatch_is_rejected_and_logged(
    mock_validate_turnstile,
    _mock_fetch_ipinfo,
    _mock_send_access_email,
    client,
):
    mock_validate_turnstile.return_value = _turnstile_mismatch()
    share = SasFile.objects.create(
        caption="Protected",
        file=SimpleUploadedFile("protected.txt", b"protected"),
    )

    response = client.post(
        f"/download/{share.download_uuid}/",
        data={"cf-turnstile-response": "token"},
        HTTP_HOST="sas.krispc.fr",
        REMOTE_ADDR="1.1.1.1",
    )

    assert response.status_code == 400

    share.refresh_from_db()
    assert share.download_count == 0

    log = SasAccessLog.objects.get(share=share)
    assert log.was_allowed is False
    assert log.reason == "turnstile_failed"
    assert log.turnstile_success is True
    assert log.turnstile_hostname == "evil.example"
    assert log.turnstile_action == "unexpected_action"
    assert log.turnstile_error_codes == ["hostname_mismatch", "action_mismatch"]


@pytest.mark.django_db
@override_settings(
    ALLOWED_HOSTS=["*"],
    SAS_RATE_LIMIT_REQUESTS=5,
    SAS_RATE_LIMIT_WINDOW_SECONDS=60,
)
@patch("sas.views.send_access_email", return_value=(True, ""))
@patch("sas.views.fetch_ipinfo_lite", return_value=({}, ""))
@patch("sas.views.validate_turnstile_token")
def test_rate_limit_blocks_sixth_download_attempt_per_ip(
    mock_validate_turnstile,
    _mock_fetch_ipinfo,
    _mock_send_access_email,
    client,
    monkeypatch,
):
    cache.clear()
    mock_validate_turnstile.return_value = _turnstile_ok()
    monkeypatch.setattr(SasFile, "MAX_DOWNLOADS", 99, raising=False)

    share = SasFile.objects.create(
        caption="Limited by IP rate",
        file=SimpleUploadedFile("ratelimited.txt", b"ratelimited"),
    )

    for _ in range(5):
        response = client.post(
            f"/download/{share.download_uuid}/",
            data={"cf-turnstile-response": "token"},
            HTTP_HOST="sas.krispc.fr",
            REMOTE_ADDR="9.9.9.9",
        )
        assert response.status_code == 200

    blocked = client.post(
        f"/download/{share.download_uuid}/",
        data={"cf-turnstile-response": "token"},
        HTTP_HOST="sas.krispc.fr",
        REMOTE_ADDR="9.9.9.9",
    )

    assert blocked.status_code == 429
    assert blocked["Cache-Control"] == "no-store, no-cache, must-revalidate"
    assert blocked["X-Robots-Tag"] == "noindex, nofollow"
    assert SasAccessLog.objects.filter(share=share, reason="rate_limited").count() == 1


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
@patch("sas.views.send_access_email", return_value=(False, "smtp-unavailable"))
@patch("sas.views.fetch_ipinfo_lite", return_value=({}, "timeout"))
@patch("sas.views.validate_turnstile_token")
def test_ipinfo_and_email_failures_are_fail_open_with_explicit_error_fields(
    mock_validate_turnstile,
    _mock_fetch_ipinfo,
    _mock_send_access_email,
    client,
):
    mock_validate_turnstile.return_value = _turnstile_ok()

    share = SasFile.objects.create(
        caption="Fail-open",
        file=SimpleUploadedFile("failopen.txt", b"payload"),
    )

    response = client.post(
        f"/download/{share.download_uuid}/",
        data={"cf-turnstile-response": "token"},
        HTTP_HOST="sas.krispc.fr",
        REMOTE_ADDR="4.4.4.4",
    )

    assert response.status_code == 200

    log = SasAccessLog.objects.get(share=share)
    assert log.was_allowed is True
    assert log.ipinfo_error == "timeout"
    assert log.email_sent is False
    assert log.email_error == "smtp-unavailable"


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
@patch("sas.views.send_access_email", return_value=(True, ""))
@patch("sas.views.fetch_ipinfo_lite", return_value=({"ip": "8.8.4.4"}, ""))
@patch("sas.views.validate_turnstile_token")
def test_download_limit_is_enforced_without_incrementing_counter(
    mock_validate_turnstile,
    _mock_fetch_ipinfo,
    _mock_send_access_email,
    client,
):
    mock_validate_turnstile.return_value = _turnstile_ok()
    share = SasFile.objects.create(
        caption="Only twice",
        file=SimpleUploadedFile("twice.txt", b"limited"),
        download_count=2,
    )

    response = client.post(
        f"/download/{share.download_uuid}/",
        data={"cf-turnstile-response": "challenge-token"},
        HTTP_HOST="sas.krispc.fr",
        REMOTE_ADDR="8.8.4.4",
    )

    assert response.status_code == 429

    share.refresh_from_db()
    assert share.download_count == 2

    log = SasAccessLog.objects.get(share=share)
    assert log.was_allowed is False
    assert log.reason == "download_limit_reached"
    assert log.turnstile_success is True
