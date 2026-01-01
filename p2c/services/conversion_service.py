"""Service for converting PDF schedules to calendar events."""
import logging
import os
import uuid
from datetime import date, datetime, time
from typing import TYPE_CHECKING, Dict, List, Optional, Union

from p2c.calendar_integration.google_calendar import CalendarEventResult
from p2c.config.event_settings import EVENT_SETTINGS
from p2c.domain.models.beneficiary_event import BeneficiaryEvent

logger = logging.getLogger(__name__)


class ConversionResult:
    """Result of a PDF to calendar conversion operation."""

    def __init__(
        self,
        success: bool,
        events_created: List[Dict] = None,
        failed_events: List[Dict] = None,
        error: Optional[str] = None,
    ):
        self.success = success
        self.events_created = events_created or []
        self.failed_events = failed_events or []
        self.error = error

    def __len__(self):
        """Return the total number of events."""
        return len(self.events_created) + len(self.failed_events)

    def __iter__(self):
        """Make the result iterable over events."""
        return iter(self.events_created + self.failed_events)

    def __getitem__(self, key):
        """Support both integer and string indexing."""
        if isinstance(key, int):
            all_events = self.events_created + self.failed_events
            return all_events[key]
        elif isinstance(key, str):
            for event in self.events_created + self.failed_events:
                if event.event_id == key:
                    return event
        raise KeyError(f"Event with key {key} not found")

    def to_dict(self):
        """Convert the result to a dictionary."""
        return {
            "success": self.success,
            "events_created": [self.event_to_dict(e) for e in self.events_created],
            "failed_events": [self.event_to_dict(e) for e in self.failed_events],
            "error": self.error,
        }

    @staticmethod
    def event_to_dict(event):
        """Convert an event to a dictionary."""
        if isinstance(event, CalendarEventResult):
            return {
                "event_id": event.event.get("id") if event.event else None,
                "html_link": event.event.get("htmlLink") if event.event else None,
                "summary": (event.event or {}).get("summary"),
                "error": event.error,
            }
        return event

    def __str__(self):
        events_str = [str(e) for e in self.events_created]
        failed_str = [str(e) for e in self.failed_events]
        return f"ConversionResult(success={self.success}, events_created={events_str}, failed_events={failed_str}, error={self.error})"


class ConversionService:
    """Service for converting PDF schedules to calendar events."""

    def __init__(self, calendar_service, pdf_parser=None):
        """Initialize service with calendar service and optional PDF parser."""
        if not calendar_service:
            raise ValueError("calendar_service is required")
        if not pdf_parser:
            raise ValueError("pdf_parser is required")

        self._calendar_service = (
            calendar_service  # Use underscore prefix for consistency
        )
        self._pdf_parser = pdf_parser

        # Public attributes for backward compatibility
        self.calendar_service = calendar_service
        self.pdf_parser = pdf_parser

    def _convert_to_calendar_events(
        self, schedule_entries: List[Dict]
    ) -> tuple[List[Dict], List[Dict]]:
        """Convert schedule entries to calendar events format."""
        events = []
        seen_events = set()
        failed_events = []

        for entry in schedule_entries:
            if not self._validate_schedule_entry(entry, failed_events):
                continue

            # Extract event details
            start_time = self._parse_datetime(entry.get("start_time", ""))
            end_time = self._parse_datetime(entry.get("end_time", ""))
            location = entry.get("location")
            notes = entry.get("notes", "")
            color_id = entry.get("colorId")
            event_description = entry.get("event_description")

            # Extract and normalize beneficiary name from description
            beneficiary_name = entry.get("normalized_name", "")

            # Create BeneficiaryEvent instance
            beneficiary_event = BeneficiaryEvent(
                id=entry.get("id", str(uuid.uuid4())),
                beneficiary_name=beneficiary_name,
                start_time=start_time,
                end_time=end_time,
                location=location,
                color_id=color_id,
                event_description=event_description,
                notes=notes,
            )

            # Convert to calendar event format
            event = beneficiary_event.to_calendar_event()

            # Create a unique key for the event
            event_key = (
                event["summary"],
                event["start"]["dateTime"],
                event["end"]["dateTime"],
            )

            # Only add the event if it's not a duplicate
            if event_key not in seen_events:
                seen_events.add(event_key)
                events.append(event)
            else:
                failed_events.append(
                    CalendarEventResult(success=False, error="Duplicate event")
                )

        return events, failed_events

    def _create_events_sequential(
        self, events: List[Dict], calendar_id: str = "jobTest"
    ) -> ConversionResult:
        """Create events one by one."""
        events_created = []
        failed_events = []

        for event in events:
            try:
                result = self._calendar_service.create_event(
                    event, calendar_id=calendar_id
                )
                if result.success:
                    events_created.append(result)
                else:
                    failed_events.append(result)
            except Exception as e:
                failed_events.append(CalendarEventResult(success=False, error=str(e)))

        # Success if at least one event was created
        success = len(events_created) > 0 or len(events) == 0
        error = (
            None
            if success
            else (
                failed_events[0].error
                if failed_events
                else "Failed to create any events"
            )
        )
        return ConversionResult(success, events_created, failed_events, error)

    def _create_events_batch(
        self, events: List[Dict], calendar_id: str = "jobTest"
    ) -> ConversionResult:
        """Create events in batch."""
        try:
            results = self._calendar_service.batch_create_events(
                events, calendar_id=calendar_id
            )
            events_created = [r for r in results if r.success]
            failed_events = [r for r in results if not r.success]

            # Success if at least one event was created
            success = len(events_created) > 0 or len(events) == 0
            error = (
                None
                if success
                else (
                    failed_events[0].error
                    if failed_events
                    else "Failed to create any events"
                )
            )
            return ConversionResult(success, events_created, failed_events, error)

        except Exception as e:
            error_msg = str(e)
            failed_events = [
                CalendarEventResult(success=False, error=error_msg) for event in events
            ]
            return ConversionResult(False, [], failed_events, error_msg)

    def process_pdf_and_create_events(
        self,
        pdf_path: str,
        dry_run: bool = False,
        use_batch: bool = True,
        calendar_id: str = "jobTest",
    ) -> ConversionResult:
        """Process a PDF file and create calendar events."""
        try:
            # Validate PDF file exists
            if not os.path.exists(pdf_path):
                return ConversionResult(False, [], [], "PDF file not found")

            # Extract schedule entries from PDF
            try:
                schedule_entries = self._pdf_parser.extract_schedule_entries(pdf_path)
            except Exception as e:
                return ConversionResult(False, [], [], str(e))

            if not schedule_entries:
                return ConversionResult(
                    False, [], [], "No schedule entries found in PDF"
                )

            # Convert schedule entries to calendar events
            events, failed_entries = self._convert_to_calendar_events(schedule_entries)
            if not events and not failed_entries:
                return ConversionResult(
                    False, [], [], "No valid events found in schedule"
                )

            # In dry run mode, just return the events that would be created
            if dry_run:
                return ConversionResult(
                    True,
                    [
                        CalendarEventResult(
                            success=True,
                            event={
                                "id": f"dry_run_{i}",
                                "htmlLink": "#",
                                "summary": event.get("summary", ""),
                            },
                        )
                        for i, event in enumerate(events)
                    ],
                    failed_entries,
                )

            # Delete existing events for all affected months if not in dry run mode
            try:
                if not dry_run and events:
                    # Identify all unique (year, month) pairs from the events
                    months_to_clear = set()
                    for event in events:
                        start_time = event["start"]["dateTime"]
                        # start_time is isoformat, e.g., 2025-01-31T10:00:00
                        try:
                            # Parse year and month from string manually to be safe/fast
                            # or use datetime.fromisoformat if python version allows (3.7+)
                            # split 'YYYY-MM'
                            y_str, m_str = start_time.split("-")[:2]
                            months_to_clear.add((int(y_str), int(m_str)))
                        except (ValueError, IndexError):
                            logger.warning(f"Could not parse date from {start_time}")
                            continue

                    for year, month in months_to_clear:
                        delete_result = self._calendar_service.delete_events_in_month(
                            year, month, calendar_id
                        )
                        if not delete_result.success:
                            logger.warning(
                                "Failed to delete existing events for %s-%s: %s",
                                year,
                                month,
                                delete_result.error,
                            )
            except Exception as e:
                logger.warning("Error deleting existing events: %s", e)

            # Create events using batch or sequential mode
            try:
                result = (
                    self._create_events_batch(events, calendar_id)
                    if use_batch
                    else self._create_events_sequential(events, calendar_id)
                )
            except Exception as e:
                return ConversionResult(False, [], [], str(e))

            # Add failed entries from validation
            result.failed_events.extend(failed_entries)

            # Update success flag based on whether any events were created
            # If we have events to create but all failed, mark as failure
            result.success = (
                len(result.events_created) > 0 if events else len(failed_entries) == 0
            )

            return result

        except Exception as e:
            error_msg = str(e)
            logger.error("Error processing PDF: %s", error_msg)
            return ConversionResult(False, [], [], error_msg)

    def _validate_schedule_entry(self, entry: Dict, failed_events: List[Dict]) -> bool:
        """Validate a schedule entry."""
        required_fields = ["start_time", "end_time"]

        # Check all required fields are present
        if not all(field in entry for field in required_fields):
            logger.warning("Missing required fields in entry: %s", entry)
            failed_events.append(
                CalendarEventResult(success=False, error="Missing required fields")
            )
            return False

        # Validate date fields
        try:
            # Try parsing the date
            start_time = self._parse_datetime(entry.get("start_time", ""))
            end_time = self._parse_datetime(entry.get("end_time", ""))

            if not (start_time and end_time):
                raise ValueError("Invalid date format")
        except (ValueError, TypeError):
            logger.warning("Invalid date in entry: %s", entry)
            failed_events.append(
                CalendarEventResult(success=False, error="Invalid date")
            )
            return False

        return True

    def _parse_datetime(self, datetime_str: str) -> datetime:
        """Parse a datetime string."""
        try:
            return datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M:%S%z")
        except ValueError:
            try:
                return datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                return None


# Alias for backward compatibility
PDFToCalendarService = ConversionService
