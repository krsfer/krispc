"""Configuration for event colors and notes."""
import json
import os
import unicodedata
from typing import Any, Dict

# Path to the event settings JSON file
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "event_settings_data.json")

DEFAULT_EVENT_SETTINGS = {
    "colorId": "1",
    "description": "Default Scheduled appointment",
    "location": "Default Paris, France",
}


def _strip_accents(value: str) -> str:
    """Fold accented characters to ASCII equivalents for matching."""
    if not value:
        return ""
    return "".join(
        char
        for char in unicodedata.normalize("NFD", value)
        if unicodedata.category(char) != "Mn"
    )


def _name_lookup_key(name: str) -> str:
    """Build a case-insensitive, accent-insensitive lookup key."""
    if not name:
        return ""
    return _strip_accents(name).upper()


def resolve_event_settings_key(settings: Dict[str, Dict[str, Any]], name: str) -> str | None:
    """Resolve a beneficiary name to the best matching key in event settings."""
    if not settings or not name:
        return None

    from .caregiver_settings import normalize_caregiver_name, strip_duration_from_name

    clean_name = strip_duration_from_name(name).strip()
    if not clean_name:
        return None

    canonical_name = normalize_caregiver_name(clean_name) or clean_name

    # Fast-path exact key lookup for canonical name.
    if canonical_name in settings and canonical_name != "DEFAULT":
        return canonical_name

    non_default_keys = [key for key in settings.keys() if key != "DEFAULT"]

    # Prefer keys that normalize to the same canonical name.
    canonical_matches = []
    for key in non_default_keys:
        clean_key = strip_duration_from_name(key).strip()
        if not clean_key:
            continue
        if (normalize_caregiver_name(clean_key) or clean_key) == canonical_name:
            canonical_matches.append(key)

    if canonical_matches:
        canonical_lookup = _name_lookup_key(canonical_name)
        for key in canonical_matches:
            if _name_lookup_key(strip_duration_from_name(key).strip()) == canonical_lookup:
                return key
        return canonical_matches[0]

    # Fallback to direct input matching (accent/case-insensitive).
    target_lookups = {
        _name_lookup_key(clean_name),
        _name_lookup_key(canonical_name),
    }
    for key in non_default_keys:
        clean_key = strip_duration_from_name(key).strip()
        if _name_lookup_key(clean_key) in target_lookups:
            return key

    return None


def get_event_settings_for_name(
    name: str, settings: Dict[str, Dict[str, Any]] | None = None
) -> Dict[str, Any]:
    """Get event settings for a beneficiary name with normalization and fallback."""
    settings_map = settings or load_event_settings()
    default_settings = settings_map.get("DEFAULT", DEFAULT_EVENT_SETTINGS)
    matched_key = resolve_event_settings_key(settings_map, name)
    if matched_key:
        return settings_map.get(matched_key, default_settings)
    return default_settings


def load_event_settings() -> Dict:
    """Load event settings from JSON file."""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"DEFAULT": DEFAULT_EVENT_SETTINGS.copy()}
    except Exception:
        return {"DEFAULT": DEFAULT_EVENT_SETTINGS.copy()}


def save_event_settings(settings: Dict) -> None:
    """Save event settings to JSON file."""
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=4)


# Initialize settings
EVENT_SETTINGS = load_event_settings()


def _save_event_settings() -> None:
    """Save EVENT_SETTINGS to file."""
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(EVENT_SETTINGS, f, indent=4, ensure_ascii=False)
    except Exception as e:
        raise RuntimeError(f"Failed to save event settings: {e}")
