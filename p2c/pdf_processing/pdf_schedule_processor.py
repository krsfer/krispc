#!/usr/bin/env python
"""Script to process PDF schedules."""
import json
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).resolve().parent.parent.parent)
sys.path.insert(0, project_root)  # Add the project root directory first

# Set up Django BEFORE any model imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "p2c_config.settings")
import django

django.setup()

from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

# Django and other imports AFTER Django setup
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.files import File
from django.db import models, transaction
from django.db.models.manager import Manager

from p2c.models import Document

if TYPE_CHECKING:
    from django.db.models.manager import Manager

    from p2c.services.conversion_service import PDFToCalendarService

    class Document(models.Model):
        objects: Manager["Document"]


import argparse
from datetime import datetime
from unittest.mock import MagicMock

from p2c.calendar_integration.google_calendar import GoogleCalendarService

from .parser_factory import PDFParserFactory

# Directory containing test fixtures
TEST_FIXTURES_DIR = os.path.join(project_root, "tests/test_fixtures")


class PDFScheduleProcessor:
    """Processor for handling PDF schedule conversion to calendar events."""

    def __init__(
        self,
        pdf_path: Optional[str] = None,
        dry_run: bool = False,
        batch_mode: bool = False,
        conversion_service: Optional[Any] = None,
    ):
        """Initialize the PDF processor."""
        self.pdf_path = pdf_path
        self.dry_run = dry_run
        self.batch_mode = batch_mode
        self.parser = None  # Will be set when processing document
        self.conversion_service = conversion_service

        # Get or create test user
        User = get_user_model()
        self.user, _ = User.objects.get_or_create(
            username="test_user", defaults={"email": "test@example.com"}
        )

        # Mock Google credentials for testing on the profile
        self.user.p2c_profile = MagicMock()
        self.user.p2c_profile.google_credentials = MagicMock()
        self.user.p2c_profile.google_credentials.valid = True
        self.user.p2c_profile.google_credentials.expired = False

        # Initialize Google Calendar service
        self.calendar_service = GoogleCalendarService(
            credentials=self.user.p2c_profile.google_credentials
        )

    @transaction.atomic
    def process_document(self) -> Document:
        """Process and create a Document object for the PDF."""
        if self.pdf_path is None:
            raise ValueError("PDF path cannot be None")

        if not os.path.exists(self.pdf_path):
            raise FileNotFoundError(
                f"PDF file not found at {os.path.basename(self.pdf_path)}"
            )

        try:
            with open(self.pdf_path, "rb") as f:
                doc = Document.objects.create(
                    file=File(f, name=os.path.basename(self.pdf_path)),
                    user=self.user,
                    processed=False,
                    processing=True,
                )
            return doc
        except Exception as e:
            raise ValueError(f"Failed to create document: {str(e)}")

    def process_pdf(self) -> bool:
        """Process the PDF schedule and create calendar events."""
        try:
            # Validate credentials first
            if (
                not self.user.p2c_profile.google_credentials.valid
                or self.user.p2c_profile.google_credentials.expired
            ):
                print("\nError processing PDF: Invalid or expired credentials")
                return False

            print(f"\nProcessing PDF file: {os.path.basename(self.pdf_path)}")

            # Create appropriate parser for the PDF
            try:
                self.parser = PDFParserFactory.create_parser(self.pdf_path)
            except ValueError as e:
                print(f"Error creating parser: {e}")
                return False

            # Process the document
            doc = self.process_document()
            if not doc:
                print("Failed to process document")
                return False

            print(
                f"\nProcessing document {doc.id} with filename: {os.path.basename(doc.file.path)} (batch mode: {self.batch_mode})"
            )

            try:
                # Extract schedule entries
                print(
                    f"Extracting schedule entries from {os.path.basename(doc.file.path)}"
                )
                schedule_entries = self.parser.extract_schedule_entries(doc.file.path)

                # Ensure each entry has required fields
                valid_entries = []
                for entry in schedule_entries:
                    if entry is None:
                        print(
                            "Warning: Error validating entry: 'NoneType' object is not subscriptable"
                        )
                        continue
                    try:
                        # Check for un-auxiliadom format
                        if all(
                            key in entry for key in ["client", "start_time", "end_time"]
                        ):
                            # Convert to common format
                            valid_entries.append(
                                {
                                    "day": entry["start_time"].day,
                                    "start_time": entry["start_time"].strftime("%H:%M"),
                                    "end_time": entry["end_time"].strftime("%H:%M"),
                                    "description": f"{entry['client']}",
                                }
                            )
                        # Check for auxiliadom format
                        elif all(
                            key in entry
                            for key in ["day", "start_time", "end_time", "description"]
                        ):
                            valid_entries.append(entry)
                        else:
                            print(f"Warning: Invalid entry format: {entry}")
                    except Exception as e:
                        print(f"Warning: Error validating entry: {str(e)}")

                print(f"Found {len(valid_entries)} valid schedule entries")

                # Check for unknown beneficiaries if parser supports it
                if hasattr(self.parser, "get_unknown_beneficiaries"):
                    unknown_beneficiaries = self.parser.get_unknown_beneficiaries()
                    if unknown_beneficiaries:
                        print(
                            "\n⚠️  Unknown beneficiaries detected (not in event_settings_data.json):"
                        )

                        # Separate real beneficiaries from administrative entries
                        real_beneficiaries = {}
                        for name, info in unknown_beneficiaries.items():
                            print(f"\n  Name: {name}")
                            print(f"  Telephone: {info['telephone']}")
                            print(f"  Location: {info['location']}")
                            print(f"  Full description: {info['full_description']}")

                            # Only add entries with valid phone numbers (real beneficiaries)
                            if info["telephone"] != "Not found":
                                real_beneficiaries[name] = info

                        # Automatically add real beneficiaries to event_settings_data.json
                        if real_beneficiaries and not self.dry_run:
                            self._add_beneficiaries_to_settings(real_beneficiaries)

                if not valid_entries:
                    doc.error_message = "No valid schedule entries found"
                    doc.processed = True
                    doc.processing = False
                    doc.save()
                    return False

                # Get or create conversion service
                if self.conversion_service is None:
                    # Only create calendar service if we need to create a new conversion service
                    self.conversion_service = PDFToCalendarService(
                        pdf_parser=self.parser, calendar_service=self.calendar_service
                    )

                # Process PDF and create calendar events
                print("Processing PDF and creating calendar events")
                result = self.conversion_service.process_pdf_and_create_events(
                    self.parser,
                    self.user,
                    dry_run=self.dry_run,
                    batch_mode=self.batch_mode,
                )

                # Update document status
                doc.processed = True
                doc.processing = False
                if not result.success:
                    doc.error_message = result.error
                doc.save()

                if result.success:
                    print(
                        f"\nSuccessfully processed {len(result.events_created)} events:"
                    )
                    has_valid_events = True
                    for event in result.events_created:
                        summary = event.get("summary", "Unknown")
                        start = event.get("start", {}).get("dateTime", "")
                        end = event.get("end", {}).get("dateTime", "")

                        # Format the datetime strings
                        if start and end:
                            try:
                                start_dt = datetime.fromisoformat(
                                    start.replace("Z", "+00:00")
                                )
                                end_dt = datetime.fromisoformat(
                                    end.replace("Z", "+00:00")
                                )
                                print(f"  - {summary}")
                                print(f"    Date: {start_dt.strftime('%Y-%m-%d')}")
                                print(
                                    f"    Time: {start_dt.strftime('%H:%M')} - {end_dt.strftime('%H:%M')}"
                                )
                            except ValueError:
                                print(f"  - {summary} (Time format error)")
                                has_valid_events = False
                        else:
                            print(f"  - {summary} (No time information)")
                            has_valid_events = False

                        if "html_link" in event:
                            print(f"    Link: {event['html_link']}")

                    return has_valid_events
                else:
                    print(f"\nError: {result.error}")
                    if result.failed_events:
                        print("\nFailed events:")
                        for event in result.failed_events:
                            print(f"  - Error: {event.get('error', 'Unknown error')}")
                    return False

            except Exception as e:
                doc.error_message = str(e)
                doc.processed = True
                doc.processing = False
                doc.save()
                raise

        except Exception as e:
            print(f"\nError processing PDF: {str(e)}")
            return False

    def flush_calendar(self, calendar_id: str, month_name: str, year: int) -> int:
        """
        Remove all events from the specified calendar for the given month.

        Args:
            calendar_id: ID of the Google Calendar
            month_name: Name of the month in French
            year: Year as integer

        Returns:
            int: Number of events deleted
        """
        # Convert French month name to number
        month_map = {
            "Janvier": 1,
            "Février": 2,
            "Mars": 3,
            "Avril": 4,
            "Mai": 5,
            "Juin": 6,
            "Juillet": 7,
            "Août": 8,
            "Septembre": 9,
            "Octobre": 10,
            "Novembre": 11,
            "Décembre": 12,
        }

        month_num = month_map.get(month_name)
        if not month_num:
            raise ValueError(f"Invalid month name: {month_name}")

        # Calculate time bounds for the month
        start_date = datetime(year, month_num, 1).isoformat() + "Z"
        end_date = (
            datetime(year, month_num + 1, 1).isoformat() + "Z"
            if month_num < 12
            else datetime(year + 1, 1, 1).isoformat() + "Z"
        )

        # Get all events in the date range
        events_result = (
            self.calendar_service.events()
            .list(
                calendarId=calendar_id,
                timeMin=start_date,
                timeMax=end_date,
                singleEvents=True,
            )
            .execute()
        )

        # Delete each event
        deleted_count = 0
        for event in events_result.get("items", []):
            self.calendar_service.events().delete(
                calendarId=calendar_id, eventId=event["id"]
            ).execute()
            deleted_count += 1

        return deleted_count

    def create_events(self, calendar_id: str, events_data: List[Dict]) -> int:
        """
        Create new events in the calendar from the parsed schedule data.

        Args:
            calendar_id: ID of the Google Calendar
            events_data: List of event dictionaries with start/end times and descriptions

        Returns:
            int: Number of events created
        """
        created_count = 0
        for event in events_data:
            self.calendar_service.events().insert(
                calendarId=calendar_id, body=event
            ).execute()
            created_count += 1

        return created_count

    def _add_beneficiaries_to_settings(
        self, beneficiaries: Dict[str, Dict[str, str]]
    ) -> None:
        """
        Add unknown beneficiaries to event_settings_data.json file.

        Args:
            beneficiaries: Dictionary of beneficiary names and their info
        """
        settings_path = os.path.join(
            project_root, "p2c/config/event_settings_data.json"
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

                    print(f"\n✅ Added {name} to event_settings_data.json")
                    print(f"   - Color ID: {next_color}")
                    print(f"   - Description: {phone_description}")
                    print(f"   - Location: {info['location']}")

                    # Cycle to next color
                    next_color = (next_color % 11) + 1

            if added_count > 0:
                # Write updated settings back to file
                with open(settings_path, "w", encoding="utf-8") as f:
                    json.dump(settings, f, ensure_ascii=False, indent=4)

                print(
                    f"\n📝 Successfully added {added_count} new beneficiaries to event_settings_data.json"
                )

        except Exception as e:
            print(f"\n❌ Error updating event_settings_data.json: {str(e)}")


def main():
    """Main entry point for command line usage."""
    parser = argparse.ArgumentParser(
        description="Process PDF schedules and create calendar events"
    )
    parser.add_argument("pdf_path", help="Path to the PDF file to process")
    parser.add_argument(
        "--dry-run", action="store_true", help="Don't create actual calendar events"
    )
    parser.add_argument(
        "--batch", action="store_true", help="Use batch processing for calendar events"
    )

    args = parser.parse_args()

    processor = PDFScheduleProcessor(
        pdf_path=args.pdf_path, dry_run=args.dry_run, batch_mode=args.batch
    )
    result = processor.process_pdf()

    print(f"\nFinal status: {'Success' if result else 'Failed'}")
    return 0 if result else 1


if __name__ == "__main__":
    sys.exit(main())
