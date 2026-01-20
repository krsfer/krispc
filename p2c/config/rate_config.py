"""Configuration for payment rates."""
import json
import os
from typing import Dict

# Path to the rate config JSON file
RATE_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "rate_config.json")


def load_rate_config() -> Dict[str, float]:
    """Load rate configuration from JSON file."""
    try:
        if os.path.exists(RATE_CONFIG_FILE):
            with open(RATE_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"weekday_rate": 25.00, "sunday_rate": 35.00}
    except Exception:
        return {"weekday_rate": 25.00, "sunday_rate": 35.00}


def save_rate_config(rates: Dict[str, float]) -> None:
    """Save rate configuration to JSON file."""
    try:
        with open(RATE_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(rates, f, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to save rate configuration: {e}")


# Initialize rates
RATE_CONFIG = load_rate_config()
