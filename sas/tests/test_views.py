from unittest.mock import patch

import pytest
from django.core import mail
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from sas.models import SasAccessLog, SasFile


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
def test_public_page_exposes_active_file_and_turnstile_form(client):
    share = SasFile.objects.create(
        caption="Demo caption",
        file=SimpleUploadedFile("demo.txt", b"hello world"),
    )

    response = client.get("/", HTTP_HOST="sas.krispc.fr")

    assert response.status_code == 200
    assert response.context["active_share"].pk == share.pk
    assert "turnstile" in response.context["download_form"].fields


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
def test_staff_user_can_upload_file_and_caption(staff_client):
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
    assert SasFile.objects.count() == 1
    created = SasFile.objects.get()
    assert created.caption == "Release candidate"
    assert created.download_count == 0


@pytest.mark.django_db
@override_settings(
    ALLOWED_HOSTS=["*"],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
@patch("sas.views.fetch_ipinfo_lite")
@patch("sas.forms.TurnstileField.validate", return_value=None)
def test_successful_download_increments_counter_and_sends_email(
    _mock_turnstile_validate,
    mock_fetch_ipinfo,
    client,
):
    mock_fetch_ipinfo.return_value = {
        "ip": "8.8.8.8",
        "latitude": 37.386,
        "longitude": -122.0838,
        "country_code": "US",
    }
    share = SasFile.objects.create(
        caption="Download me",
        file=SimpleUploadedFile("payload.txt", b"payload"),
    )

    response = client.post(
        f"/download/{share.pk}/",
        data={"turnstile": "challenge-token"},
        HTTP_HOST="sas.krispc.fr",
        REMOTE_ADDR="8.8.8.8",
        HTTP_USER_AGENT="curl/8.0.1",
    )

    assert response.status_code == 200
    assert "attachment;" in response["Content-Disposition"]

    share.refresh_from_db()
    assert share.download_count == 1

    log = SasAccessLog.objects.get(share=share)
    assert log.was_allowed is True
    assert log.ip_address == "8.8.8.8"

    assert len(mail.outbox) == 1
    assert "8.8.8.8" in mail.outbox[0].body
    assert "api.ipinfo.io/lite/8.8.8.8" in mail.outbox[0].body


@pytest.mark.django_db
@override_settings(
    ALLOWED_HOSTS=["*"],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
@patch("sas.views.fetch_ipinfo_lite", return_value={"ip": "8.8.4.4"})
@patch("sas.forms.TurnstileField.validate", return_value=None)
def test_download_is_blocked_after_two_downloads(
    _mock_turnstile_validate,
    _mock_fetch_ipinfo,
    client,
):
    share = SasFile.objects.create(
        caption="Only twice",
        file=SimpleUploadedFile("twice.txt", b"limited"),
        download_count=2,
    )

    response = client.post(
        f"/download/{share.pk}/",
        data={"turnstile": "challenge-token"},
        HTTP_HOST="sas.krispc.fr",
        REMOTE_ADDR="8.8.4.4",
    )

    assert response.status_code == 429

    share.refresh_from_db()
    assert share.download_count == 2

    log = SasAccessLog.objects.get(share=share)
    assert log.was_allowed is False
    assert len(mail.outbox) == 1


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["*"])
@patch("sas.forms.TurnstileField.validate", side_effect=ValidationError("invalid challenge"))
def test_invalid_turnstile_rejects_download(_mock_turnstile_validate, client):
    share = SasFile.objects.create(
        caption="Protected",
        file=SimpleUploadedFile("protected.txt", b"protected"),
    )

    response = client.post(
        f"/download/{share.pk}/",
        data={"turnstile": "bad-token"},
        HTTP_HOST="sas.krispc.fr",
        REMOTE_ADDR="1.1.1.1",
    )

    assert response.status_code == 400

    share.refresh_from_db()
    assert share.download_count == 0
