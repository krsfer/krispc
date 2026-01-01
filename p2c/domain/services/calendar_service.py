import asyncio
import json
import logging
import re
from datetime import datetime
from time import sleep
from typing import Optional

import pytz  # Import pytz library
from asgiref.sync import sync_to_async
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.discovery_cache.base import Cache
from googleapiclient.errors import HttpError

from p2c.config import event_settings_data

from ..models.beneficiary_event import BeneficiaryEvent

logger = logging.getLogger(__name__)


class CalendarService:
    """Service for interacting with Google Calendar API."""

    def __init__(self, credentials):
        """
        Initialize the calendar service.

        Args:
            credentials: Google OAuth2 credentials
        """
        # If credentials is a string or dict, convert to Credentials object
        if isinstance(credentials, (str, dict)):
            if isinstance(credentials, str):
                credentials_dict = json.loads(credentials)
            else:
                credentials_dict = credentials

            credentials = Credentials(
                token=credentials_dict.get("token"),
                refresh_token=credentials_dict.get("refresh_token"),
                token_uri=credentials_dict.get("token_uri"),
                client_id=credentials_dict.get("client_id"),
                client_secret=credentials_dict.get("client_secret"),
                scopes=credentials_dict.get("scopes"),
            )

        self.credentials = credentials
        self.service = build("calendar", "v3", credentials=credentials)
        self.logger = logger
        self._load_event_settings()
        self.calendar_id = None  # Add calendar_id attribute

    def set_calendar_id(self, calendar_id):
        """Set the calendar ID to use for operations."""
        self.calendar_id = calendar_id

    def _load_event_settings(self):
        with open("p2c/config/event_settings_data.json", "r") as f:
            self.event_settings = json.load(f)

    def get_event_settings_by_name(self, event):
        """
        Get event settings for a given name, falling back to DEFAULT if not found
        """

        logging.info("#" * 80)

        name = event.get("name")
        logging.info(f"Looking up event settings for name: '{name}'")
        event_settings = self.event_settings.get(name)
        logging.info(event_settings)
        logging.info("Available event settings: %s", self.event_settings)

        # Try to find exact match first
        settings = event_settings
        logging.info("Found settings for '%s': %s", name, settings)

        # If no exact match, try to find a case-insensitive match
        if not settings:
            logging.info("No exact match found, trying case-insensitive match")
            for key in self.event_settings:
                if key.lower() == name.lower():
                    settings = self.event_settings[key]
                    logging.info("Found case-insensitive match: %s -> %s", name, key)
                    break

        # If still no match, use DEFAULT settings
        if not settings:
            logging.info("No match found, using DEFAULT settings")
            settings = self.event_settings.get("DEFAULT", {})

        return {
            "colorId": settings.get("colorId"),
            "description": settings.get("description", ""),
            "location": settings.get("location", ""),
        }

    async def create_calendar_event(self, name, start_time, end_time):
        """Create calendar event using settings matched by name."""
        if not self.calendar_id:
            raise ValueError("Calendar ID not set. Call set_calendar_id first.")

        # Extract name without time using regex and convert to title case
        name = re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()
        name = " ".join(word.capitalize() for word in name.split())

        event_settings = self.get_event_settings_by_name({"name": name})
        calendar_name = await self.get_calendar_name()

        # Format the timestamp with the description
        paris_tz = pytz.timezone("Europe/Paris")
        current_time = datetime.now(paris_tz)
        creation_time_str = current_time.strftime("%Y-%m-%d %H:%M:%S")

        description_parts = [
            f"Created: {creation_time_str}",
            f"Calendar: {calendar_name}",
            event_settings["description"],
        ]
        full_description = "\n".join(filter(None, description_parts))

        event = {
            "summary": name,
            "description": full_description,
            "start": {"dateTime": start_time.isoformat(), "timeZone": "Europe/Paris"},
            "end": {"dateTime": end_time.isoformat(), "timeZone": "Europe/Paris"},
        }

        if "colorId" in event_settings:
            event["colorId"] = event_settings["colorId"]

        if "location" in event_settings:
            event["location"] = event_settings["location"]

        try:
            # Properly handle async execution
            insert_request = self.service.events().insert(
                calendarId=self.calendar_id, body=event
            )

            # Convert execute to async and await it
            execute_async = sync_to_async(insert_request.execute)
            created_event = await execute_async()

            event_id = created_event.get("id")
            if event_id:
                logger.info(
                    f"Successfully created event '{name}' in calendar '{calendar_name}'"
                )
                return event_id
            return None

        except Exception as e:
            logger.error(f"Failed to create event: {e}")
            return None

    async def update_event(self, event_id: str, event: BeneficiaryEvent) -> bool:
        """
        Update an existing calendar event.

        Args:
            event_id: ID of the event to update
            event: Updated BeneficiaryEvent data

        Returns:
            True if update successful, False otherwise
        """
        if not self.calendar_id:
            raise ValueError("Calendar ID not set. Call set_calendar_id first.")

        try:
            calendar_name = await self.get_calendar_name()
            calendar_event = event.to_calendar_event()

            # Convert the sync operation to async
            update_event = sync_to_async(self.service.events().update)
            execute = sync_to_async(lambda x: x.execute())

            # Update and execute the request
            request = await update_event(
                calendarId=self.calendar_id, eventId=event_id, body=calendar_event
            )
            await execute(request)

            logger.info(
                f"Successfully updated event '{event_id}' in calendar '{calendar_name}'"
            )
            return True

        except Exception as e:
            self.logger.error(
                f"Error updating calendar event in '{calendar_name}': {str(e)}"
            )
            return False

    async def delete_event(self, event_id: str) -> bool:
        """
        Delete a calendar event.

        Args:
            event_id: ID of the event to delete

        Returns:
            True if successful, False otherwise

        Raises:
            ValueError: If calendar_id is not set
        """
        if not self.calendar_id:
            raise ValueError("Calendar ID not set. Call set_calendar_id first.")

        try:
            calendar_name = await self.get_calendar_name()

            # Convert the sync operation to async
            delete_event = sync_to_async(self.service.events().delete)
            execute = sync_to_async(lambda x: x.execute())

            # Delete and execute the request
            request = await delete_event(calendarId=self.calendar_id, eventId=event_id)
            await execute(request)

            logger.info(
                f"Successfully deleted event '{event_id}' from calendar '{calendar_name}'"
            )
            return True

        except Exception as e:
            self.logger.error(
                f"Error deleting calendar event from '{calendar_name}': {str(e)}"
            )
            return False

    async def delete_events_for_month(self, year, month):
        """Delete all events in the specified month from the calendar."""
        if not self.calendar_id:
            raise ValueError("Calendar ID not set. Call set_calendar_id first.")

        # Create time bounds for the month
        start_of_month = datetime(year, month, 1).isoformat() + "Z"
        if month == 12:
            end_of_month = datetime(year + 1, 1, 1).isoformat() + "Z"
        else:
            end_of_month = datetime(year, month + 1, 1).isoformat() + "Z"

        try:
            # Convert sync operations to async
            list_events = sync_to_async(self.service.events().list)
            delete_event = sync_to_async(self.service.events().delete)
            execute = sync_to_async(lambda x: x.execute())

            # Get all events in the specified time range
            request = await list_events(
                calendarId=self.calendar_id,
                timeMin=start_of_month,
                timeMax=end_of_month,
                singleEvents=True,
                maxResults=2500,  # Get all events at once
            )
            events_result = await execute(request)
            events = events_result.get("items", [])

            # Delete events in batches with rate limiting
            deleted_count = 0
            batch_size = 10  # Process 10 events at a time

            for i in range(0, len(events), batch_size):
                batch = events[i : i + batch_size]
                for event in batch:
                    try:
                        request = await delete_event(
                            calendarId=self.calendar_id, eventId=event["id"]
                        )
                        await execute(request)
                        deleted_count += 1
                    except HttpError as e:
                        if e.resp.status == 403 and "Rate Limit Exceeded" in str(e):
                            # Wait and retry once if rate limited
                            await asyncio.sleep(2)  # Wait 2 seconds
                            try:
                                request = await delete_event(
                                    calendarId=self.calendar_id, eventId=event["id"]
                                )
                                await execute(request)
                                deleted_count += 1
                            except Exception:
                                self.logger.warning(
                                    f"Failed to delete event {event['id']} after retry"
                                )
                        else:
                            self.logger.warning(
                                f"Failed to delete event {event['id']}: {str(e)}"
                            )

                # Add a small delay between batches to avoid rate limiting
                await asyncio.sleep(0.5)  # Wait 500ms between batches

            return deleted_count

        except Exception as e:
            self.logger.error(f"Error deleting events: {str(e)}")
            raise

    async def get_calendar_name(self):
        """Get the name of the currently selected calendar."""
        if not self.calendar_id:
            raise ValueError("Calendar ID not set. Call set_calendar_id first.")

        try:
            # Convert sync operations to async
            get_calendar = sync_to_async(self.service.calendars().get)
            execute = sync_to_async(lambda x: x.execute())

            # Get calendar details
            request = await get_calendar(calendarId=self.calendar_id)
            calendar = await execute(request)

            return calendar.get("summary", self.calendar_id)

        except Exception as e:
            self.logger.error(f"Error getting calendar name: {str(e)}")
            return self.calendar_id  # Fallback to ID if name can't be retrieved
