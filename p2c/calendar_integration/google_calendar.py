"""Google Calendar service module."""
import json
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


def should_keep_event(description):
    """
    Check if an event should be kept based on its description.
    Returns True if the event contains any variation of 'keep' pattern.
    """
    if not description:
        return False

    # Define all possible keep patterns
    keep_patterns = [
        r"«\s*keep\s*»",  # «keep» or « keep »
        r"<\s*keep\s*>",  # <keep> or < keep >
        r"\{\s*keep\s*\}",  # {keep} or { keep }
        r"\(\s*keep\s*\)",  # (keep) or ( keep )
    ]

    # Check each pattern (case-insensitive)
    for pattern in keep_patterns:
        if re.search(pattern, description, re.IGNORECASE):
            return True

    return False


@dataclass
class CalendarEventResult:
    """Result of a calendar event operation."""

    success: bool
    event: Optional[Dict] = None
    error: Optional[str] = None


class GoogleCalendarService:
    """Service for interacting with Google Calendar API."""

    def __init__(self, credentials: Dict | str):
        """Initialize the calendar service with credentials."""
        # Handle string credentials (JSON string)
        if isinstance(credentials, str):
            try:
                credentials = json.loads(credentials)
            except json.JSONDecodeError:
                raise ValueError("Invalid credentials JSON string")

        # Convert dict to Credentials object
        if isinstance(credentials, dict):
            credentials = Credentials(
                token=credentials.get("token"),
                refresh_token=credentials.get("refresh_token"),
                token_uri=credentials.get("token_uri"),
                client_id=credentials.get("client_id"),
                client_secret=credentials.get("client_secret"),
                scopes=credentials.get("scopes"),
            )
        elif not isinstance(credentials, Credentials):
            raise ValueError(
                "Credentials must be a dict, JSON string, or Credentials object"
            )

        self.service = build("calendar", "v3", credentials=credentials)

    def create_event(
        self, event_data: Dict, calendar_id: str = "primary"
    ) -> CalendarEventResult:
        """Create a new calendar event."""
        try:
            # Create a new dictionary for the event to avoid modifying the input
            event = {}

            # Required fields
            event["summary"] = event_data.get("summary", "Scheduled Appointment")
            event["start"] = event_data["start"]
            event["end"] = event_data["end"]

            # Optional fields - only add if they have non-empty values
            description = event_data.get("description")
            if description and description.strip():
                event["description"] = description

            location = event_data.get("location")
            if location and location.strip():
                event["location"] = location

            colorId = event_data.get("colorId")
            if colorId:
                event["colorId"] = colorId

            # Default fields
            event.setdefault("reminders", {"useDefault": True})
            if event_data.get("attendees"):
                event["attendees"] = [
                    {"email": attendee} for attendee in event_data["attendees"]
                ]

            # Create the event
            result = (
                self.service.events()
                .insert(calendarId=calendar_id, body=event)
                .execute()
            )

            return CalendarEventResult(success=True, event=result)

        except HttpError as e:
            return CalendarEventResult(success=False, error=str(e))
        except Exception as e:
            return CalendarEventResult(success=False, error=str(e))

    def batch_create_events(
        self, events: List[Dict], calendar_id: str = "primary"
    ) -> List[CalendarEventResult]:
        """Create multiple calendar events in batch."""
        results = []
        for event_data in events:
            try:
                result = self.create_event(event_data, calendar_id)
                results.append(result)
            except Exception as error:
                results.append(CalendarEventResult(success=False, error=str(error)))
        return results

    def update_event(
        self, event_id: str, event_data: Dict, calendar_id: str = "primary"
    ) -> CalendarEventResult:
        """Update an existing calendar event."""
        try:
            # Format the event data for update
            event = {}

            # Add optional fields if they exist
            if "summary" in event_data:
                event["summary"] = event_data["summary"]
            if "description" in event_data:
                event["description"] = event_data["description"]
            if "location" in event_data:
                event["location"] = event_data["location"]
            if "colorId" in event_data:
                event["colorId"] = event_data["colorId"]

            # Add start and end times if provided
            if "start" in event_data:
                event["start"] = event_data["start"]
            if "end" in event_data:
                event["end"] = event_data["end"]

            # Update the event
            result = (
                self.service.events()
                .patch(calendarId=calendar_id, eventId=event_id, body=event)
                .execute()
            )

            if not result:
                error = "No result returned from Google Calendar API"
                return CalendarEventResult(success=False, error=error)

            return CalendarEventResult(success=True, event=result)

        except HttpError as error:
            error_msg = f"Google Calendar API error: {error.reason}"
            return CalendarEventResult(success=False, error=error_msg)
        except Exception as error:
            error_msg = f"Error updating calendar event: {str(error)}"
            return CalendarEventResult(success=False, error=error_msg)

    def delete_event(
        self, event_id: str, calendar_id: str = "primary"
    ) -> CalendarEventResult:
        """Delete a calendar event."""
        try:
            self.service.events().delete(
                calendarId=calendar_id, eventId=event_id
            ).execute()
            return CalendarEventResult(success=True)
        except HttpError as error:
            error_msg = f"Google Calendar API error: {error.reason}"
            return CalendarEventResult(success=False, error=error_msg)
        except Exception as error:
            error_msg = f"Error deleting calendar event: {str(error)}"
            return CalendarEventResult(success=False, error=error_msg)

    def delete_events_in_month(
        self, year: int, month: int, calendar_id: str = "primary"
    ) -> CalendarEventResult:
        """Delete all events in a specified month from a calendar, except those marked to keep."""
        try:
            # Calculate start and end of month
            start_of_month = f"{year}-{month:02d}-01T00:00:00Z"
            if month == 12:
                end_of_month = f"{year + 1}-01-01T00:00:00Z"
            else:
                end_of_month = f"{year}-{month + 1:02d}-01T00:00:00Z"

            # Get all events in the month
            events_result = (
                self.service.events()
                .list(
                    calendarId=calendar_id,
                    timeMin=start_of_month,
                    timeMax=end_of_month,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )

            events = events_result.get("items", [])

            # Delete each event unless it's marked to keep
            deleted_count = 0
            skipped_count = 0

            for event in events:
                description = event.get("description", "")
                if should_keep_event(description):
                    skipped_count += 1
                    continue

                try:
                    self.service.events().delete(
                        calendarId=calendar_id, eventId=event["id"]
                    ).execute()
                    deleted_count += 1
                except Exception:
                    continue

            return CalendarEventResult(
                success=True,
                event={"deleted_count": deleted_count, "skipped_count": skipped_count},
            )

        except Exception as error:
            return CalendarEventResult(success=False, error=str(error))

    def get_calendar_list(self) -> List[Dict]:
        """Get list of user's calendars."""
        try:
            calendar_list = self.service.calendarList().list().execute()
            return [
                {
                    "id": calendar["id"],
                    "summary": calendar["summary"],
                    "primary": calendar.get("primary", False),
                }
                for calendar in calendar_list.get("items", [])
            ]
        except Exception as e:
            print(f"Error fetching calendar list: {e}")
            return []

    def get_calendar_id_by_name(self, calendar_name: str) -> Optional[str]:
        """Get the ID of a calendar by its name."""
        try:
            calendar_list = self.get_calendar_list()
            for calendar in calendar_list:
                if calendar["summary"] == calendar_name:
                    return calendar["id"]
            return None
        except Exception:
            return None

    def list_events_in_month(
        self,
        year: int,
        month: int,
        calendar_id: str = "primary",
        single_events: bool = True,
    ) -> List[Dict]:
        """
        List all events in a specified month from a calendar.

        Args:
            year: The year (e.g., 2025)
            month: The month (1-12)
            calendar_id: Calendar ID (default 'primary')
            single_events: If True, expand recurring events into instances.
                          If False, return recurring events as single items.

        Returns:
            List of event dictionaries with full Google Calendar event data.
        """
        try:
            # Calculate start and end of month
            start_of_month = f"{year}-{month:02d}-01T00:00:00Z"
            if month == 12:
                end_of_month = f"{year + 1}-01-01T00:00:00Z"
            else:
                end_of_month = f"{year}-{month + 1:02d}-01T00:00:00Z"

            events = []
            page_token = None

            while True:
                events_result = (
                    self.service.events()
                    .list(
                        calendarId=calendar_id,
                        timeMin=start_of_month,
                        timeMax=end_of_month,
                        singleEvents=single_events,
                        orderBy="startTime" if single_events else None,
                        maxResults=250,
                        pageToken=page_token,
                    )
                    .execute()
                )

                events.extend(events_result.get("items", []))
                page_token = events_result.get("nextPageToken")

                if not page_token:
                    break

            # Enrich events with additional metadata
            for event in events:
                # Mark if this is part of a recurring series
                event["isRecurring"] = "recurringEventId" in event
                # Store the parent recurring event ID if this is an instance
                event["parentRecurringEventId"] = event.get("recurringEventId")

            return events

        except HttpError as error:
            print(f"Google Calendar API error listing events: {error.reason}")
            return []
        except Exception as error:
            print(f"Error listing events: {str(error)}")
            return []

    def get_event(self, event_id: str, calendar_id: str = "primary") -> Optional[Dict]:
        """Get a single event by its ID."""
        try:
            return (
                self.service.events()
                .get(calendarId=calendar_id, eventId=event_id)
                .execute()
            )
        except Exception:
            return None

    def get_event_by_details(
        self, calendar_id: str, summary: str, start_time: str, end_time: str
    ) -> Optional[Dict]:
        """Get an event by its summary, start time, and end time."""
        try:
            events_result = (
                self.service.events()
                .list(
                    calendarId=calendar_id,
                    q=summary,
                    timeMin=start_time,
                    timeMax=end_time,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            events = events_result.get("items", [])
            for event in events:
                if (
                    event["summary"] == summary
                    and event["start"].get("dateTime") == start_time
                    and event["end"].get("dateTime") == end_time
                ):
                    return event
            return None
        except Exception:
            return None

    def create_calendar(self, calendar_name: str) -> Dict:
        """Create a new calendar."""
        try:
            calendar = {"summary": calendar_name, "timeZone": "Europe/Paris"}
            created_calendar = self.service.calendars().insert(body=calendar).execute()
            return created_calendar
        except Exception as e:
            raise e


class GoogleCalendarAPI:
    def create_event(self, event_data, calendar_id: str = "primary"):
        """
        Create an event in Google Calendar
        event_data should contain: summary, description, location, colorId, start, end
        """
        try:
            event = (
                self.service.events()
                .insert(calendarId=calendar_id, body=event_data)
                .execute()
            )
            return event
        except Exception as e:
            print(f"An error occurred: {e}")
            return None
