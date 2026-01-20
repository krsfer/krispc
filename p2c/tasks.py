import logging
import re
import time
from datetime import datetime
from django.utils.translation import gettext as _

import redis
from celery import shared_task
from celery_progress.backend import ProgressRecorder
from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .domain.services.calendar_service import CalendarService
from .redis_connection import get_redis_connection
from .models import CalendarBackup
from .backup_utils import generate_backup_file

logger = logging.getLogger(__name__)


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


@shared_task(bind=True)
def test_task(self):
    """Test task to verify Celery configuration."""
    progress_recorder = ProgressRecorder(self)
    for i in range(100):
        time.sleep(0.1)
        progress_recorder.set_progress(i + 1, 100, f"Processing {i + 1}%")
    return {"status": "completed"}


@shared_task(bind=True)
def delete_events_task(self, calendar_id, credentials, target_month, target_year):
    """
    Delete events from Google Calendar for a specific month and year
    """
    try:
        logger.info(
            f"Starting delete_events_task for month {target_month}, year {target_year}"
        )

        # Create a progress recorder for this task
        progress_recorder = ProgressRecorder(self)

        # Use task id as a lock key to prevent duplicate executions
        # In development, skip the lock if Redis is unavailable
        lock = None
        try:
            lock_id = f"delete_events_{calendar_id}_{target_month}_{target_year}"
            # Use secure Redis connection
            redis_client = get_redis_connection()
            lock = redis_client.lock(lock_id, timeout=300)  # 5 minute timeout

            if not lock.acquire(blocking=False):
                logger.info(
                    f"Task {self.request.id} skipped - another task is already running for this calendar/month"
                )
                progress_recorder.set_progress(
                    100, 100, "Task skipped - already in progress"
                )
                return "Task skipped - already in progress"
        except Exception as redis_error:
            # Log the error but continue in development mode
            logger.warning(f"Redis lock unavailable (continuing anyway): {str(redis_error)}")
            lock = None

        try:
            # Initialize credentials and service
            credentials = Credentials(
                token=credentials["token"],
                refresh_token=credentials.get("refresh_token"),
                token_uri=credentials.get("token_uri"),
                client_id=credentials.get("client_id"),
                client_secret=credentials.get("client_secret"),
                scopes=credentials.get("scopes"),
            )

            service = build("calendar", "v3", credentials=credentials)

            # Calculate time bounds for the target month
            start_date = datetime(target_year, target_month, 1).isoformat() + "Z"
            if target_month == 12:
                end_date = datetime(target_year + 1, 1, 1).isoformat() + "Z"
            else:
                end_date = datetime(target_year, target_month + 1, 1).isoformat() + "Z"

            # Get events for the month
            events_result = (
                service.events()
                .list(
                    calendarId=calendar_id,
                    timeMin=start_date,
                    timeMax=end_date,
                    singleEvents=True,
                )
                .execute()
            )
            events = events_result.get("items", [])

            total_events = len(events)
            logger.info(f"Found {total_events} events to delete")

            # Set initial progress
            progress_recorder.set_progress(
                0, total_events, f"Found {total_events} events to delete"
            )

            if total_events == 0:
                progress_recorder.set_progress(100, 100, _("No events found to delete"))
                return _("No events found to delete")

            # Filter events and delete in batches
            batch_size = 10  # Process 10 events at a time
            deleted_count = 0
            skipped_count = 0
            retry_delay = 2  # Initial delay in seconds
            max_retries = 3  # Maximum number of retries per event

            for i in range(0, total_events, batch_size):
                batch = events[i : i + batch_size]

                for event in batch:
                    # Check if event should be kept
                    description = event.get("description", "")
                    if should_keep_event(description):
                        skipped_count += 1
                        logger.info(
                            f"Skipping event {event['id']} - contains keep marker"
                        )
                        continue

                    retries = 0
                    while retries < max_retries:
                        try:
                            logger.debug(
                                f"URL being requested: DELETE {service.events().delete(calendarId=calendar_id, eventId=event['id']).execute()}"
                            )
                            deleted_count += 1
                            break  # Success, exit retry loop
                        except Exception as e:
                            if "rateLimitExceeded" in str(e):
                                retries += 1
                                if retries < max_retries:
                                    sleep_time = retry_delay * (2**retries)
                                    logger.warning(
                                        f"Rate limit hit, waiting {sleep_time} seconds before retry {retries}"
                                    )
                                    time.sleep(sleep_time)
                                    continue
                            elif "410" in str(e) and "Resource has been deleted" in str(
                                e
                            ):
                                deleted_count += 1
                                logger.info(f"Event {event['id']} was already deleted")
                                break
                            else:
                                logger.error(
                                    f"Error deleting event {event['id']}: {str(e)}"
                                )
                                break  # Non-rate-limit error, skip this event

                    # Update progress after each deletion - use ProgressRecorder
                    processed_count = deleted_count + skipped_count
                    current_progress = min(processed_count, total_events)
                    progress_recorder.set_progress(
                        current_progress,
                        total_events,
                        f"Processed {processed_count} of {total_events} events (deleted: {deleted_count}, skipped: {skipped_count})",
                    )

                # Add delay between batches to avoid rate limits
                time.sleep(1)  # 1 second delay between batches

            # Set final progress
            progress_recorder.set_progress(
                total_events,
                total_events,
                f"Successfully processed {total_events} events (deleted: {deleted_count}, skipped: {skipped_count})",
            )

            return f"Successfully processed {total_events} events (deleted: {deleted_count}, skipped: {skipped_count})"

        finally:
            # Always release the lock, even if there's an error
            if lock is not None:
                try:
                    lock.release()
                except Exception as e:
                    logger.warning(f"Error releasing lock: {str(e)}")

    except Exception as e:
        logger.error(f"Error in delete_events_task: {str(e)}")
        raise Exception(f"Error deleting events: {str(e)}")


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
    retry_backoff=True,
)
def create_events_task(
    self, calendar_id, credentials, appointments, update_existing=False
):
    """
    Create or update events in Google Calendar from appointments
    """
    try:
        # Initialize credentials and service
        credentials = Credentials(
            token=credentials["token"],
            refresh_token=credentials.get("refresh_token"),
            token_uri=credentials.get("token_uri"),
            client_id=credentials.get("client_id"),
            client_secret=credentials.get("client_secret"),
            scopes=credentials.get("scopes"),
        )
        service = build("calendar", "v3", credentials=credentials)

        # Filter out any breaks that might have slipped through
        filtered_appointments = [
            apt
            for apt in appointments
            if not any(
                break_term in apt["description"].lower()
                for break_term in ["temps de pause repas", "pause", "repas"]
            )
        ]

        total_appointments = len(filtered_appointments)
        created_events = 0
        updated_events = 0
        progress_recorder = ProgressRecorder(self)

        # Process in batches
        batch_size = 10
        retry_delay = 2
        max_retries = 3

        for i in range(0, total_appointments, batch_size):
            batch = filtered_appointments[i : i + batch_size]

            # prettyprint the batch
            logger.info(f"########### Processing batch: {batch}")

            for appointment in batch:
                retries = 0
                while retries < max_retries:
                    try:
                        # Get the exact name from description (should be in "SURNAME, Firstname" format)
                        name = appointment["description"].strip()

                        # Use settings from appointment data
                        settings = {
                            "colorId": appointment["colorId"],
                            "description": appointment["description"],
                            "location": appointment["location"],
                        }

                        # Create event with settings
                        event = {
                            "summary": appointment["summary"],
                            "start": {
                                "dateTime": appointment["start_time"],
                                "timeZone": "Europe/Paris",
                            },
                            "end": {
                                "dateTime": appointment["end_time"],
                                "timeZone": "Europe/Paris",
                            },
                            "colorId": settings["colorId"],
                            "description": settings["description"],
                            "location": settings["location"],
                        }

                        if update_existing:
                            # Ensure datetime has timezone suffix for Google Calendar API
                            time_min = event["start"]["dateTime"]
                            time_max = event["end"]["dateTime"]
                            # Add timezone offset if not present (Europe/Paris is UTC+1 in winter)
                            if (
                                not time_min.endswith("Z")
                                and "+" not in time_min
                                and "-" not in time_min[-6:]
                            ):
                                time_min += "+01:00"
                            if (
                                not time_max.endswith("Z")
                                and "+" not in time_max
                                and "-" not in time_max[-6:]
                            ):
                                time_max += "+01:00"

                            existing_event = (
                                service.events()
                                .list(
                                    calendarId=calendar_id,
                                    q=event["summary"],
                                    timeMin=time_min,
                                    timeMax=time_max,
                                    singleEvents=True,
                                )
                                .execute()
                                .get("items", [])
                            )

                            if existing_event:
                                updated_event = (
                                    service.events()
                                    .update(
                                        calendarId=calendar_id,
                                        eventId=existing_event[0]["id"],
                                        body=event,
                                    )
                                    .execute()
                                )
                                updated_events += 1
                                logger.info(
                                    f"Updated event: {updated_event.get('id')} for {name} with color {settings['colorId']}"
                                )
                            else:
                                created_event = (
                                    service.events()
                                    .insert(calendarId=calendar_id, body=event)
                                    .execute()
                                )
                                created_events += 1
                                logger.info(
                                    f"Created event: {created_event.get('id')} for {name} with color {settings['colorId']}"
                                )
                        else:
                            created_event = (
                                service.events()
                                .insert(calendarId=calendar_id, body=event)
                                .execute()
                            )
                            created_events += 1
                            logger.info(
                                f"Created event: {created_event.get('id')} for {name} with color {settings['colorId']}"
                            )

                        # Update progress after each event creation
                        progress = (
                            (created_events + updated_events) / total_appointments
                        ) * 100
                        progress_recorder.set_progress(
                            created_events + updated_events,
                            total_appointments,
                            f"Processed {created_events + updated_events} of {total_appointments} events",
                        )

                        break  # Success, exit retry loop

                    except Exception as e:
                        if "rateLimitExceeded" in str(e):
                            retries += 1
                            if retries < max_retries:
                                sleep_time = retry_delay * (2**retries)
                                logger.warning(
                                    f"Rate limit hit, waiting {sleep_time} seconds before retry {retries}"
                                )
                                time.sleep(sleep_time)
                                continue
                        logger.error(f"Error creating event: {str(e)}")
                        break  # Non-rate-limit error, skip this event

            # Add delay between batches to avoid rate limits
            time.sleep(1)

        return {
            "status": "success",
            "message": f"Successfully created {created_events} and updated {updated_events} events",
            "created_count": created_events,
            "updated_count": updated_events,
        }

    except Exception as e:
        logger.error(f"Error in create_events_task: {str(e)}")
        return {"status": "error", "message": f"Error creating events: {str(e)}"}


@shared_task(bind=True)
def sync_calendar_task(
    self, user_id, calendar_id, calendar_name, credentials, appointments, target_month, target_year
):
    """
    Sync calendar by first creating a backup, then deleting all events for the month, then creating new ones.
    This ensures no duplicate events and allows rollback if needed.
    """
    try:
        logger.info(
            f"Starting sync_calendar_task for month {target_month}, year {target_year}"
        )

        progress_recorder = ProgressRecorder(self)

        # Initialize credentials and service
        creds = Credentials(
            token=credentials["token"],
            refresh_token=credentials.get("refresh_token"),
            token_uri=credentials.get("token_uri"),
            client_id=credentials.get("client_id"),
            client_secret=credentials.get("client_secret"),
            scopes=credentials.get("scopes"),
        )
        service = build("calendar", "v3", credentials=creds)

        # Calculate time bounds for the target month
        start_date = datetime(target_year, target_month, 1).isoformat() + "Z"
        if target_month == 12:
            end_date = datetime(target_year + 1, 1, 1).isoformat() + "Z"
        else:
            end_date = datetime(target_year, target_month + 1, 1).isoformat() + "Z"

        # PHASE 1: Delete existing events for the month
        progress_recorder.set_progress(0, 100, "Fetching existing events...")

        events_result = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=start_date,
                timeMax=end_date,
                singleEvents=True,
            )
            .execute()
        )
        existing_events = events_result.get("items", [])

        total_to_delete = len(existing_events)
        deleted_count = 0
        skipped_count = 0

        logger.info(f"Found {total_to_delete} existing events to delete")

        # Create backup before deleting events
        if total_to_delete > 0:
            try:
                logger.info(f"Creating backup of {total_to_delete} events before deletion")

                # Generate backup file
                backup_file_path = generate_backup_file(
                    user_id=user_id,
                    calendar_id=calendar_id,
                    calendar_name=calendar_name,
                    month=target_month,
                    year=target_year,
                    events=existing_events
                )

                # Create database record
                backup = CalendarBackup.objects.create(
                    user_id=user_id,
                    calendar_id=calendar_id,
                    calendar_name=calendar_name,
                    month=target_month,
                    year=target_year,
                    event_count=total_to_delete,
                    events_json=existing_events,
                    sync_operation="sync_pdf",
                    json_file_path=backup_file_path
                )

                logger.info(f"Backup created successfully: {backup.id} at {backup_file_path}")
            except Exception as backup_error:
                logger.error(f"Failed to create backup: {str(backup_error)}")
                # Continue with sync even if backup fails, but log the error
                # In production, you might want to abort the sync if backup fails

        if total_to_delete > 0:
            progress_recorder.set_progress(
                0, 100, f"Deleting {total_to_delete} existing events..."
            )

            for event in existing_events:
                # Check if event should be kept
                description = event.get("description", "")
                if should_keep_event(description):
                    skipped_count += 1
                    logger.info(f"Skipping event {event['id']} - contains keep marker")
                    continue

                try:
                    service.events().delete(
                        calendarId=calendar_id, eventId=event["id"]
                    ).execute()
                    deleted_count += 1
                except Exception as e:
                    if "410" in str(e) and "Resource has been deleted" in str(e):
                        deleted_count += 1
                        logger.info(f"Event {event['id']} was already deleted")
                    else:
                        logger.error(f"Error deleting event {event['id']}: {str(e)}")

                # Update progress (deletion is 0-40% of total progress)
                delete_progress = int(
                    (deleted_count + skipped_count) / total_to_delete * 40
                )
                progress_recorder.set_progress(
                    delete_progress,
                    100,
                    f"Deleted {deleted_count} of {total_to_delete} events (skipped: {skipped_count})",
                )

                # Small delay to avoid rate limits
                time.sleep(0.1)

        logger.info(
            f"Deletion complete: deleted {deleted_count}, skipped {skipped_count}"
        )

        # PHASE 2: Create new events
        # Filter out any breaks
        filtered_appointments = [
            apt
            for apt in appointments
            if not any(
                break_term in apt.get("description", "").lower()
                for break_term in ["temps de pause repas", "pause", "repas"]
            )
        ]

        total_to_create = len(filtered_appointments)
        created_count = 0

        logger.info(f"Creating {total_to_create} new events")
        progress_recorder.set_progress(
            40, 100, f"Creating {total_to_create} new events..."
        )

        batch_size = 10
        retry_delay = 2
        max_retries = 3

        for i in range(0, total_to_create, batch_size):
            batch = filtered_appointments[i : i + batch_size]

            for appointment in batch:
                retries = 0
                while retries < max_retries:
                    try:
                        event = {
                            "summary": appointment["summary"],
                            "start": {
                                "dateTime": appointment["start_time"],
                                "timeZone": "Europe/Paris",
                            },
                            "end": {
                                "dateTime": appointment["end_time"],
                                "timeZone": "Europe/Paris",
                            },
                            "colorId": appointment.get("colorId", "1"),
                            "description": appointment.get("description", ""),
                            "location": appointment.get("location", ""),
                        }

                        service.events().insert(
                            calendarId=calendar_id, body=event
                        ).execute()
                        created_count += 1

                        # Update progress (creation is 40-100% of total progress)
                        create_progress = 40 + int(created_count / total_to_create * 60)
                        progress_recorder.set_progress(
                            create_progress,
                            100,
                            f"Created {created_count} of {total_to_create} events",
                        )

                        break  # Success

                    except Exception as e:
                        if "rateLimitExceeded" in str(e):
                            retries += 1
                            if retries < max_retries:
                                sleep_time = retry_delay * (2**retries)
                                logger.warning(
                                    f"Rate limit hit, waiting {sleep_time} seconds"
                                )
                                time.sleep(sleep_time)
                                continue
                        logger.error(f"Error creating event: {str(e)}")
                        break

            # Delay between batches
            time.sleep(0.5)

        progress_recorder.set_progress(
            100,
            100,
            f"Sync complete! Deleted {deleted_count}, created {created_count} events",
        )

        return {
            "status": "success",
            "message": f"Sync complete: deleted {deleted_count} (skipped {skipped_count}), created {created_count} events",
            "deleted_count": deleted_count,
            "skipped_count": skipped_count,
            "created_count": created_count,
        }

    except Exception as e:
        logger.error(f"Error in sync_calendar_task: {str(e)}")
        return {"status": "error", "message": f"Error syncing calendar: {str(e)}"}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def restore_backup_task(self, backup_id, user_id, credentials, event_indices=None):
    """
    Restore calendar events from a backup asynchronously with progress tracking.

    Args:
        backup_id: ID of the CalendarBackup to restore
        user_id: ID of the user performing the restore
        credentials: Google OAuth credentials dict
        event_indices: Optional list of event indices to restore (None = restore all)

    Returns:
        dict with status, counts, and messages
    """
    try:
        logger.info(f"Starting restore_backup_task for backup {backup_id}")

        progress_recorder = ProgressRecorder(self)
        progress_recorder.set_progress(0, 100, "Loading backup data...")

        # Load backup from database
        try:
            backup = CalendarBackup.objects.get(id=backup_id, user_id=user_id)
        except CalendarBackup.DoesNotExist:
            logger.error(f"Backup {backup_id} not found for user {user_id}")
            return {"status": "error", "message": "Backup not found"}

        # Initialize Google Calendar service
        progress_recorder.set_progress(5, 100, "Connecting to Google Calendar...")
        creds = Credentials(
            token=credentials["token"],
            refresh_token=credentials.get("refresh_token"),
            token_uri=credentials.get("token_uri"),
            client_id=credentials.get("client_id"),
            client_secret=credentials.get("client_secret"),
            scopes=credentials.get("scopes"),
        )
        service = build("calendar", "v3", credentials=creds)

        # Determine which events to restore
        if event_indices:
            events_to_restore = [
                backup.events_json[i]
                for i in event_indices
                if i < len(backup.events_json)
            ]
            logger.info(f"Restoring {len(events_to_restore)} selected events")
        else:
            events_to_restore = backup.events_json
            logger.info(f"Restoring all {len(events_to_restore)} events")

        if not events_to_restore:
            return {"status": "error", "message": _("No events to restore")}

        total_events = len(events_to_restore)
        restored_count = 0
        skipped_count = 0
        failed_count = 0

        progress_recorder.set_progress(
            10, 100, f"Restoring {total_events} events..."
        )

        # Restore events with exponential backoff for rate limits
        for idx, event_data in enumerate(events_to_restore):
            event_title = event_data.get('summary', 'Untitled')

            # Remove read-only fields to prevent duplicate errors
            event_copy = event_data.copy()
            read_only_fields = [
                'id', 'iCalUID', 'etag', 'htmlLink',
                'created', 'updated', 'creator', 'organizer'
            ]
            for field in read_only_fields:
                event_copy.pop(field, None)

            # Retry with exponential backoff
            max_retries = 3
            retry_delay = 1.0  # Start with 1 second

            for retry in range(max_retries):
                try:
                    service.events().insert(
                        calendarId=backup.calendar_id,
                        body=event_copy
                    ).execute()
                    restored_count += 1
                    logger.info(f"Restored event: {event_title}")
                    break  # Success, exit retry loop

                except Exception as event_error:
                    error_str = str(event_error)

                    # Handle duplicate events (409 error)
                    if '409' in error_str or 'duplicate' in error_str.lower():
                        skipped_count += 1
                        logger.info(f"Skipped duplicate event: {event_title}")
                        break  # Exit retry loop, move to next event

                    # Handle rate limiting (403 error)
                    elif 'rateLimitExceeded' in error_str or '403' in error_str:
                        if retry < max_retries - 1:
                            sleep_time = retry_delay * (2 ** retry)  # Exponential backoff
                            logger.warning(
                                f"Rate limit hit for '{event_title}', "
                                f"waiting {sleep_time}s (attempt {retry + 1}/{max_retries})"
                            )
                            progress_recorder.set_progress(
                                10 + int((idx / total_events) * 90),
                                100,
                                f"Rate limit hit, waiting {sleep_time}s... ({restored_count + skipped_count}/{total_events})"
                            )
                            time.sleep(sleep_time)
                            continue  # Retry
                        else:
                            # Max retries exceeded
                            failed_count += 1
                            logger.error(f"Failed after {max_retries} retries: {event_title}")
                            break

                    # Handle other errors
                    else:
                        failed_count += 1
                        logger.error(f"Error restoring event '{event_title}': {error_str}")
                        break  # Exit retry loop, move to next event

            # Update progress (10-100% for restoration)
            current_progress = 10 + int(((idx + 1) / total_events) * 90)
            progress_recorder.set_progress(
                current_progress,
                100,
                f"Restored {restored_count}/{total_events} (skipped: {skipped_count}, failed: {failed_count})"
            )

            # Small delay between events to avoid rate limits
            time.sleep(0.1)

        # Final progress update
        progress_recorder.set_progress(
            100,
            100,
            f"Restore complete! {restored_count} restored, {skipped_count} skipped, {failed_count} failed"
        )

        logger.info(
            f"Restore complete for backup {backup_id}: "
            f"{restored_count} restored, {skipped_count} skipped, {failed_count} failed"
        )

        return {
            "status": "success",
            "calendar_name": backup.calendar_name,
            "restored_count": restored_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "total_events": total_events,
            "message": f"Restored {restored_count} events (skipped {skipped_count} duplicates, {failed_count} failed)"
        }

    except Exception as e:
        logger.error(f"Error in restore_backup_task: {str(e)}")
        return {
            "status": "error",
            "message": f"Error restoring backup: {str(e)}"
        }
