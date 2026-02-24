from __future__ import annotations

import os
from collections.abc import Mapping

from django.core.exceptions import ImproperlyConfigured


def _normalized_env_value(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def require_secret(
    name: str,
    *,
    is_production: bool,
    env: Mapping[str, str] | None = None,
    dev_default: str | None = None,
) -> str:
    source = env if env is not None else os.environ
    value = _normalized_env_value(source.get(name))
    if value:
        return value

    if is_production:
        raise ImproperlyConfigured(
            f"Missing required secret '{name}' in production environment."
        )

    if dev_default is None:
        return ""
    return dev_default


def validate_redis_mtls_env(
    *,
    env: Mapping[str, str] | None = None,
) -> tuple[str | None, str | None, str | None]:
    source = env if env is not None else os.environ
    ca_path = _normalized_env_value(source.get("REDIS_CA_CERT_PATH"))
    client_cert_path = _normalized_env_value(source.get("REDIS_CLIENT_CERT_PATH"))
    client_key_path = _normalized_env_value(source.get("REDIS_CLIENT_KEY_PATH"))

    provided = [bool(ca_path), bool(client_cert_path), bool(client_key_path)]
    if any(provided) and not all(provided):
        raise ImproperlyConfigured(
            "Redis mTLS config is partial. Set REDIS_CA_CERT_PATH, "
            "REDIS_CLIENT_CERT_PATH, and REDIS_CLIENT_KEY_PATH together."
        )

    return ca_path, client_cert_path, client_key_path
