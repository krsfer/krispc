"""Configuration for caregiver settings - persistent settings for caregivers."""
import json
import os
from typing import Any, Dict

# Path to the caregiver settings JSON file
CAREGIVER_SETTINGS_FILE = os.path.join(
    os.path.dirname(__file__), "caregiver_settings_data.json"
)

# Path to the caregiver renames JSON file (user-configurable global renames)
CAREGIVER_RENAMES_FILE = os.path.join(
    os.path.dirname(__file__), "caregiver_renames_data.json"
)

# Available Google Calendar color IDs (1-11)
AVAILABLE_COLOR_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]

# Name normalization mapping (incorrect -> correct) - hardcoded corrections
# Keys should be uppercase for matching
NAME_CORRECTIONS = {
    "BASZCZOWSKI, STEPHANI": "BASZCZOWSKI, Stephanie",
}


# ============================================================================
# Caregiver Renames Functions (user-configurable via UI)
# ============================================================================


def load_caregiver_renames() -> Dict[str, str]:
    """Load caregiver renames from JSON file.

    Returns:
        Dict mapping original names (uppercase) to new names.
    """
    try:
        if os.path.exists(CAREGIVER_RENAMES_FILE):
            with open(CAREGIVER_RENAMES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}
    except Exception:
        return {}


def save_caregiver_renames(renames: Dict[str, str]) -> None:
    """Save caregiver renames to JSON file.

    Args:
        renames: Dict mapping original names to new names.
    """
    with open(CAREGIVER_RENAMES_FILE, "w", encoding="utf-8") as f:
        json.dump(renames, f, indent=4, ensure_ascii=False)


def add_caregiver_rename(original_name: str, new_name: str) -> Dict[str, str]:
    """Add a global caregiver rename.

    Args:
        original_name: The original name to be renamed.
        new_name: The new name to use instead.

    Returns:
        The updated renames dict.
    """
    renames = load_caregiver_renames()
    # Store with uppercase key for case-insensitive matching
    renames[original_name.strip().upper()] = new_name.strip()
    save_caregiver_renames(renames)
    return renames


def remove_caregiver_rename(original_name: str) -> Dict[str, str]:
    """Remove a global caregiver rename.

    Args:
        original_name: The original name to remove from renames.

    Returns:
        The updated renames dict.
    """
    renames = load_caregiver_renames()
    key = original_name.strip().upper()
    if key in renames:
        del renames[key]
        save_caregiver_renames(renames)
    return renames


def get_all_caregiver_renames() -> Dict[str, str]:
    """Get all caregiver renames for display in UI.

    Returns:
        Dict mapping original names to new names.
    """
    return load_caregiver_renames()


def strip_duration_from_name(name: str) -> str:
    """Strip duration/numeric suffix from caregiver name.

    Removes patterns like " (02:45)", " (01:30)", " (2)", " (3)" from the end of names.

    Args:
        name: The caregiver's name, possibly with duration or numeric suffix.

    Returns:
        The name without suffix, trimmed.
    """
    import re

    if not name:
        return name
    # Remove any parenthetical suffix at the end: (HH:MM), (N), etc.
    # This matches " (anything)" at the end of the string
    return re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()


def normalize_caregiver_name(name: str) -> str:
    """Normalize a caregiver name, applying user-configured renames and known corrections.

    Order of precedence:
    1. Strip duration suffix (e.g., "(02:45)")
    2. Apply user-configured renames from caregiver_renames_data.json
    3. Apply hardcoded NAME_CORRECTIONS

    Args:
        name: The caregiver's name.

    Returns:
        The corrected/normalized name.
    """
    if not name:
        return name

    # First strip any duration suffix
    name = strip_duration_from_name(name)
    name_upper = name.strip().upper()

    # Check user-configured renames first (highest priority)
    renames = load_caregiver_renames()
    if name_upper in renames:
        return renames[name_upper]

    # Check hardcoded corrections
    if name_upper in NAME_CORRECTIONS:
        return NAME_CORRECTIONS[name_upper]

    return name.strip()


def load_caregiver_settings() -> Dict[str, Dict[str, Any]]:
    """Load caregiver settings from JSON file.

    Returns:
        Dict mapping caregiver names (uppercase) to settings objects.
    """
    try:
        if os.path.exists(CAREGIVER_SETTINGS_FILE):
            with open(CAREGIVER_SETTINGS_FILE, "r", encoding="utf-8") as f:
                settings = json.load(f)
                
                # Consolidate duplicate names with different casing
                normalized_settings = {}
                for name, value in settings.items():
                    # Keep the first encountered version of the name (preferring title case)
                    if name.upper() not in [key.upper() for key in normalized_settings.keys()]:
                        normalized_settings[name.title()] = value
                
                if len(normalized_settings) != len(settings):
                    save_caregiver_settings(normalized_settings)
                
                return normalized_settings
        return {}
    except Exception:
        return {}


def save_caregiver_settings(settings: Dict[str, Dict[str, Any]]) -> None:
    """Save caregiver settings to JSON file.

    Args:
        settings: Dict mapping caregiver names to settings objects.
    """
    with open(CAREGIVER_SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=4, ensure_ascii=False)


def get_next_available_color(existing_settings: Dict[str, Dict[str, Any]]) -> str:
    """Get the next available color ID that hasn't been used yet.

    Cycles through colors 1-11, trying to avoid recently used colors.

    Args:
        existing_settings: Dict of existing caregiver->settings mappings.

    Returns:
        A colorId string (1-11).
    """
    used_colors = {s.get("colorId") for s in existing_settings.values()}

    # First, try to find an unused color
    for color_id in AVAILABLE_COLOR_IDS:
        if color_id not in used_colors:
            return color_id

    # If all colors are used, count usage and return least used
    color_counts = {c: 0 for c in AVAILABLE_COLOR_IDS}
    for s in existing_settings.values():
        color_id = s.get("colorId")
        if color_id in color_counts:
            color_counts[color_id] += 1

    # Return the least used color
    return min(color_counts, key=color_counts.get)


def get_or_assign_caregiver_setting(caregiver_name: str) -> Dict[str, Any]:
    """Get the settings for a caregiver, assigning them if not already assigned.

    Args:
        caregiver_name: The caregiver's name (will be normalized to title case).

    Returns:
        A settings object.
    """
    if not caregiver_name:
        return {}

    # Strip duration and normalize name to title case for consistent matching
    clean_name = strip_duration_from_name(caregiver_name)
    normalized_name = clean_name.strip().title()

    settings = load_caregiver_settings()

    # Check if caregiver already has a setting
    if normalized_name in settings:
        return settings[normalized_name]

    # Assign a new setting
    new_color = get_next_available_color(settings)
    new_setting = {
        "colorId": new_color,
        "Location": "",
        "Tél": "",
        "Description": "",
        "diminutive": "",
    }
    settings[normalized_name] = new_setting
    save_caregiver_settings(settings)

    return new_setting


def get_caregiver_settings_for_names(
    caregiver_names: list,
) -> Dict[str, Dict[str, Any]]:
    """Get settings for multiple caregivers at once.

    Checks event_settings_data.json (Beneficiary Settings) first for colorId,
    then falls back to caregiver_settings_data.json.

    Args:
        caregiver_names: List of caregiver names.

    Returns:
        Dict mapping caregiver names (original case) to settings objects.
    """
    from .event_settings import load_event_settings

    if not caregiver_names:
        return {}

    settings = load_caregiver_settings()
    event_settings = load_event_settings()
    result = {}
    updated = False

    for name in caregiver_names:
        if not name:
            continue

        # Strip duration and normalize for consistent color lookup
        clean_name = strip_duration_from_name(name)
        normalized_name = clean_name.strip().title()

        # Check event_settings (Beneficiary Settings) for colorId first
        event_color_id = None
        # Try exact match
        if clean_name in event_settings:
            event_color_id = event_settings[clean_name].get("colorId")
        else:
            # Try case-insensitive match
            for key, evt_setting in event_settings.items():
                if key.title() == normalized_name:
                    event_color_id = evt_setting.get("colorId")
                    break

        if normalized_name in settings:
            setting_copy = dict(settings[normalized_name])
            # Override colorId from event_settings if available
            if event_color_id:
                setting_copy["colorId"] = event_color_id
            result[name] = setting_copy
        else:
            # Use colorId from event_settings if available, otherwise assign new
            new_color = event_color_id or get_next_available_color(settings)
            new_setting = {
                "colorId": new_color,
                "Location": "",
                "Tél": "",
                "Description": "",
            }
            settings[normalized_name] = new_setting
            result[name] = new_setting
            updated = True

    if updated:
        save_caregiver_settings(settings)

    return result


def get_caregiver_colors_for_names(caregiver_names: list) -> Dict[str, str]:
    """Get colors for multiple caregivers at once.

    Checks event_settings_data.json first (Beneficiary Settings), then falls back
    to caregiver_settings_data.json for backwards compatibility.

    Args:
        caregiver_names: List of caregiver names.

    Returns:
        Dict mapping caregiver names (original case) to colorId strings.
    """
    from .event_settings import load_event_settings

    # Load event settings (Beneficiary Settings) for colorId lookup
    event_settings = load_event_settings()

    result = {}
    names_needing_fallback = []

    for name in caregiver_names:
        if not name:
            continue

        # Strip duration and normalize for lookup
        clean_name = strip_duration_from_name(name)

        # Try exact match first in event_settings
        if clean_name in event_settings:
            result[name] = event_settings[clean_name].get("colorId", "1")
            continue

        # Try uppercase match
        name_upper = clean_name.strip().title()
        found = False
        for key, settings in event_settings.items():
            if key.title() == name_upper:
                result[name] = settings.get("colorId", "1")
                found = True
                break

        if not found:
            names_needing_fallback.append(name)

    # Fallback to caregiver_settings for names not found in event_settings
    if names_needing_fallback:
        fallback_settings = get_caregiver_settings_for_names(names_needing_fallback)
        for name, setting in fallback_settings.items():
            result[name] = setting.get("colorId", "1")

    return result
