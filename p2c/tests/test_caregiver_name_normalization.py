import pytest

from p2c.config import caregiver_settings as caregiver_config
from p2c.config import event_settings as event_config


def _setting(color_id: str):
    return {
        "colorId": color_id,
        "Location": "",
        "Tél": "",
        "Description": "",
    }


@pytest.mark.django_db
def test_normalize_caregiver_name_stephanie_accent_equivalence(monkeypatch):
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})

    assert (
        caregiver_config.normalize_caregiver_name("BASZCZOWSKI, Stéphanie")
        == "BASZCZOWSKI, Stephanie"
    )
    assert (
        caregiver_config.normalize_caregiver_name("BASZCZOWSKI, Stephanie")
        == "BASZCZOWSKI, Stephanie"
    )


@pytest.mark.django_db
def test_normalize_caregiver_name_theo_accent_equivalence(monkeypatch):
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})

    assert (
        caregiver_config.normalize_caregiver_name("MACINTOSH, Théo")
        == "MACINTOSH, Theo"
    )
    assert (
        caregiver_config.normalize_caregiver_name("MACINTOSH, Theo")
        == "MACINTOSH, Theo"
    )


@pytest.mark.django_db
def test_get_caregiver_colors_for_names_matches_accent_variant(monkeypatch):
    monkeypatch.setattr(
        event_config,
        "load_event_settings",
        lambda: {"DEFAULT": {"colorId": "1"}, "MACINTOSH, Theo": {"colorId": "3"}},
    )
    monkeypatch.setattr(
        caregiver_config,
        "load_caregiver_settings",
        lambda: {"MACINTOSH, Theo": _setting("3")},
    )
    monkeypatch.setattr(caregiver_config, "save_caregiver_settings", lambda _settings: None)
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})

    colors = caregiver_config.get_caregiver_colors_for_names(["MACINTOSH, Théo"])

    assert colors["MACINTOSH, Théo"] == "3"


@pytest.mark.django_db
def test_get_caregiver_settings_for_names_reuses_equivalent_name(monkeypatch):
    existing = {"BASZCZOWSKI, Stephanie": _setting("7")}
    saved_calls = []

    monkeypatch.setattr(
        event_config,
        "load_event_settings",
        lambda: {
            "DEFAULT": {"colorId": "1"},
            "BASZCZOWSKI, Stephanie": {"colorId": "7"},
        },
    )
    monkeypatch.setattr(caregiver_config, "load_caregiver_settings", lambda: dict(existing))
    monkeypatch.setattr(
        caregiver_config,
        "save_caregiver_settings",
        lambda settings: saved_calls.append(settings),
    )
    monkeypatch.setattr(caregiver_config, "load_caregiver_renames", lambda: {})

    result = caregiver_config.get_caregiver_settings_for_names(["BASZCZOWSKI, Stéphanie"])

    assert result["BASZCZOWSKI, Stéphanie"]["colorId"] == "7"
    assert saved_calls == []
