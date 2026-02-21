import pytest

from p2c.config import caregiver_settings as caregiver_config
from p2c.config import event_settings as event_config


def _event_setting(color_id: str, description: str = "", location: str = "") -> dict:
    return {
        "colorId": color_id,
        "description": description,
        "location": location,
    }


@pytest.mark.django_db
def test_resolve_event_settings_key_prefers_canonical_stephanie(monkeypatch):
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})
    settings = {
        "DEFAULT": _event_setting("1"),
        "BASZCZOWSKI, Stephanie": _event_setting("7"),
        "BASZCZOWSKI, Stephani": _event_setting("11"),
    }

    key = event_config.resolve_event_settings_key(
        settings, "BASZCZOWSKI, Stephani"
    )

    assert key == "BASZCZOWSKI, Stephanie"


@pytest.mark.django_db
def test_get_event_settings_for_name_matches_accent_variant(monkeypatch):
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})
    settings = {
        "DEFAULT": _event_setting("1"),
        "BASZCZOWSKI, Stephanie": _event_setting(
            "7", description="Tél: 07 49 60 08 16", location="14 Chem. du Porrichon"
        ),
    }

    result = event_config.get_event_settings_for_name(
        "BASZCZOWSKI, Stéphanie", settings
    )

    assert result["colorId"] == "7"
    assert result["location"] == "14 Chem. du Porrichon"


@pytest.mark.django_db
def test_get_event_settings_for_name_matches_theo_accent_variant(monkeypatch):
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})
    settings = {
        "DEFAULT": _event_setting("1"),
        "MACINTOSH, Theo": _event_setting("3"),
    }

    result = event_config.get_event_settings_for_name("MACINTOSH, Théo", settings)

    assert result["colorId"] == "3"


@pytest.mark.django_db
def test_get_event_settings_for_name_returns_default_when_unknown(monkeypatch):
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})
    settings = {
        "DEFAULT": _event_setting("1", description="Default Scheduled appointment"),
        "MACINTOSH, Theo": _event_setting("3"),
    }

    result = event_config.get_event_settings_for_name("UNKNOWN, Person", settings)

    assert result == settings["DEFAULT"]
