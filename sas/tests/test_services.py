from unittest.mock import Mock, patch

import pytest
import requests
from django.test import RequestFactory, override_settings

from sas.services import extract_client_ip, fetch_ipinfo_lite, validate_turnstile_token


@pytest.mark.django_db
def test_extract_client_ip_prefers_fly_client_ip():
    factory = RequestFactory()
    request = factory.get(
        "/",
        HTTP_FLY_CLIENT_IP="203.0.113.10",
        HTTP_CF_CONNECTING_IP="203.0.113.20",
        REMOTE_ADDR="203.0.113.30",
    )

    assert extract_client_ip(request) == "203.0.113.10"


@pytest.mark.django_db
@override_settings(SAS_TRUST_CF_CONNECTING_IP=True)
def test_extract_client_ip_uses_cf_connecting_ip_when_enabled():
    factory = RequestFactory()
    request = factory.get("/", HTTP_CF_CONNECTING_IP="203.0.113.20", REMOTE_ADDR="203.0.113.30")

    assert extract_client_ip(request) == "203.0.113.20"


@pytest.mark.django_db
@override_settings(SAS_TRUST_CF_CONNECTING_IP=False)
def test_extract_client_ip_ignores_cf_connecting_ip_when_disabled():
    factory = RequestFactory()
    request = factory.get("/", HTTP_CF_CONNECTING_IP="203.0.113.20", REMOTE_ADDR="203.0.113.30")

    assert extract_client_ip(request) == "203.0.113.30"


@pytest.mark.django_db
@override_settings(SAS_TRUSTED_PROXY_IPS=["10.0.0.1"])
def test_extract_client_ip_uses_x_forwarded_for_only_with_trusted_proxy():
    factory = RequestFactory()
    trusted = factory.get(
        "/",
        HTTP_X_FORWARDED_FOR="198.51.100.12, 10.0.0.1",
        REMOTE_ADDR="10.0.0.1",
    )
    untrusted = factory.get(
        "/",
        HTTP_X_FORWARDED_FOR="198.51.100.12, 10.0.0.2",
        REMOTE_ADDR="10.0.0.2",
    )

    assert extract_client_ip(trusted) == "198.51.100.12"
    assert extract_client_ip(untrusted) == "10.0.0.2"


@pytest.mark.django_db
@override_settings(
    TURNSTILE_SECRET="secret-token",
    SAS_TURNSTILE_EXPECTED_ACTION="sas_download",
    SAS_TURNSTILE_EXPECTED_HOSTNAMES=["sas.krispc.fr"],
)
@patch("sas.services.requests.post")
def test_validate_turnstile_token_checks_success_hostname_and_action(mock_post):
    response = Mock()
    response.status_code = 200
    response.json.return_value = {
        "success": True,
        "hostname": "sas.krispc.fr",
        "action": "sas_download",
        "error-codes": [],
    }
    mock_post.return_value = response

    result = validate_turnstile_token("token-123", remote_ip="8.8.8.8")

    assert result.is_valid is True
    assert result.success is True
    assert result.hostname == "sas.krispc.fr"
    assert result.action == "sas_download"
    assert result.error_codes == []
    mock_post.assert_called_once()


@pytest.mark.django_db
@override_settings(
    TURNSTILE_SECRET="secret-token",
    SAS_TURNSTILE_EXPECTED_ACTION="sas_download",
    SAS_TURNSTILE_EXPECTED_HOSTNAMES=["sas.krispc.fr"],
)
@patch("sas.services.requests.post")
def test_validate_turnstile_token_rejects_hostname_and_action_mismatches(mock_post):
    response = Mock()
    response.status_code = 200
    response.json.return_value = {
        "success": True,
        "hostname": "other.krispc.fr",
        "action": "wrong_action",
        "error-codes": [],
    }
    mock_post.return_value = response

    result = validate_turnstile_token("token-123", remote_ip="8.8.8.8")

    assert result.is_valid is False
    assert "hostname_mismatch" in result.error_codes
    assert "action_mismatch" in result.error_codes


@pytest.mark.django_db
@override_settings(SAS_IPINFO_TOKEN="ipinfo-token")
@patch("sas.services.requests.get", side_effect=requests.Timeout("boom"))
def test_fetch_ipinfo_lite_returns_timeout_error_when_request_times_out(_mock_get):
    payload, error = fetch_ipinfo_lite("8.8.8.8")

    assert payload == {}
    assert error == "timeout"


@pytest.mark.django_db
@override_settings(SAS_IPINFO_TOKEN="ipinfo-token")
@patch("sas.services.requests.get")
def test_fetch_ipinfo_lite_returns_http_error_when_non_200(mock_get):
    response = Mock()
    response.status_code = 429
    response.json.return_value = {}
    mock_get.return_value = response

    payload, error = fetch_ipinfo_lite("8.8.4.4")

    assert payload == {}
    assert error == "http_429"
