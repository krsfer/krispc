"""Utility functions for beneficiary management."""
import json
import logging
import os
from typing import Dict

logger = logging.getLogger(__name__)


def add_beneficiaries_to_settings(
    beneficiaries: Dict[str, Dict[str, str]], settings_path: str = None
) -> None:
    """
    Add unknown beneficiaries to event_settings_data.json file.

    Args:
        beneficiaries: Dictionary of beneficiary names and their info
        settings_path: Optional path to settings file
    """
    if settings_path is None:
        # Default path relative to this file
        settings_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "config",
            "event_settings_data.json",
        )

    try:
        # Read existing settings
        with open(settings_path, "r", encoding="utf-8") as f:
            settings = json.load(f)

        # Get the next available colorId (cycle through 1-11, Google Calendar colors)
        used_colors = [
            int(v.get("colorId", "1"))
            for v in settings.values()
            if v.get("colorId", "").isdigit()
        ]
        next_color = 1
        for i in range(1, 12):
            if i not in used_colors:
                next_color = i
                break

        # Add new beneficiaries
        added_count = 0
        for name, info in beneficiaries.items():
            if name not in settings:
                # Format phone number with "Tél: " prefix
                phone_description = (
                    f"Tél: {info['telephone']}" if info["telephone"] else ""
                )

                settings[name] = {
                    "colorId": str(next_color),
                    "description": phone_description,
                    "location": info["location"],
                }
                added_count += 1

                logger.info("Added %s to event_settings_data.json", name)
                logger.info("  - Color ID: %s", next_color)
                logger.info("  - Description: %s", phone_description)
                logger.info("  - Location: %s", info["location"])

                # Cycle to next color
                next_color = (next_color % 11) + 1

        if added_count > 0:
            # Write updated settings back to file
            with open(settings_path, "w", encoding="utf-8") as f:
                json.dump(settings, f, ensure_ascii=False, indent=4)

            logger.info(
                "Successfully added %d new beneficiaries to event_settings_data.json",
                added_count,
            )

    except Exception as e:
        logger.error("Error updating event_settings_data.json: %s", str(e))
