import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class BeneficiaryEvent:
    """Represents a beneficiary visit event extracted from a PDF schedule."""

    id: str
    beneficiary_name: str
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    color_id: Optional[str] = None
    event_description: Optional[str] = None
    notes: Optional[str] = None

    def duration_in_minutes(self) -> int:
        """Calculate the duration of the visit in minutes."""
        delta = self.end_time - self.start_time
        return int(delta.total_seconds() / 60)

    def is_valid(self) -> bool:
        """Check if the event data is valid."""
        return (
            self.start_time < self.end_time
            and bool(self.beneficiary_name.strip())
            and bool(self.location.strip())
        )

    def to_calendar_event(self) -> dict:
        """Convert to Google Calendar event format."""
        # Load event settings
        settings_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "config",
            "event_settings_data.json",
        )
        with open(settings_path) as f:
            settings = json.load(f)

        # Try to find matching beneficiary settings
        beneficiary_settings = settings.get(self.beneficiary_name, settings["DEFAULT"])

        # Use provided values if available, otherwise fall back to beneficiary settings
        final_location = (
            self.location
            if self.location and self.location.strip()
            else beneficiary_settings["location"]
        )
        final_color_id = (
            self.color_id
            if self.color_id and self.color_id.strip()
            else beneficiary_settings["colorId"]
        )

        # Combine event_description and beneficiary_settings description
        description_parts = []
        if self.event_description and self.event_description.strip():
            description_parts.append(self.event_description)
        elif (
            beneficiary_settings.get("description")
            and beneficiary_settings["description"].strip()
        ):
            description_parts.append(beneficiary_settings["description"])

        final_description = "\n".join(description_parts)

        return {
            "summary": self.beneficiary_name,
            "location": final_location,
            "description": final_description,
            "colorId": final_color_id,
            "start": {
                "dateTime": self.start_time.isoformat(),
                "timeZone": "Europe/Paris",
            },
            "end": {
                "dateTime": self.end_time.isoformat(),
                "timeZone": "Europe/Paris",
            },
        }
