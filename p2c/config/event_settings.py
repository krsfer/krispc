"""Configuration for event colors and notes."""
import json
import os
from typing import Any, Dict, Iterator

# Path to the event settings JSON file
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "event_settings_data.json")


def load_event_settings() -> Dict:
    """Load event settings from JSON file."""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "DEFAULT": {
                "colorId": "1",
                "description": "Default Scheduled appointment",
                "location": "Default Paris, France",
            }
        }
    except Exception:
        return {
            "DEFAULT": {
                "colorId": "1",
                "description": "Default Scheduled appointment",
                "location": "Default Paris, France",
            }
        }


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
