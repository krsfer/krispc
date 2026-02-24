import pytest
from django.core.exceptions import ImproperlyConfigured

from _main.secret_utils import require_secret, validate_redis_mtls_env


def test_require_secret_uses_env_value_when_present():
    value = require_secret(
        "TURNSTILE_SECRET",
        is_production=True,
        env={"TURNSTILE_SECRET": "live-secret"},
    )
    assert value == "live-secret"


def test_require_secret_uses_dev_default_outside_production():
    value = require_secret(
        "TURNSTILE_SECRET",
        is_production=False,
        env={},
        dev_default="dev-secret",
    )
    assert value == "dev-secret"


def test_require_secret_raises_when_missing_in_production():
    with pytest.raises(ImproperlyConfigured):
        require_secret("TURNSTILE_SECRET", is_production=True, env={})


def test_validate_redis_mtls_env_allows_empty_configuration():
    assert validate_redis_mtls_env(env={}) == (None, None, None)


def test_validate_redis_mtls_env_returns_paths_when_all_values_set():
    result = validate_redis_mtls_env(
        env={
            "REDIS_CA_CERT_PATH": "/tmp/ca.pem",
            "REDIS_CLIENT_CERT_PATH": "/tmp/client.crt",
            "REDIS_CLIENT_KEY_PATH": "/tmp/client.key",
        }
    )
    assert result == ("/tmp/ca.pem", "/tmp/client.crt", "/tmp/client.key")


def test_validate_redis_mtls_env_rejects_partial_configuration():
    with pytest.raises(ImproperlyConfigured):
        validate_redis_mtls_env(
            env={
                "REDIS_CA_CERT_PATH": "/tmp/ca.pem",
                "REDIS_CLIENT_CERT_PATH": "/tmp/client.crt",
            }
        )
