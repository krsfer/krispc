"""Views for handling JSON data."""

import json
import logging
import re
from datetime import datetime, timedelta

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext as _

from .calendar_integration.google_calendar import GoogleCalendarService
from .config.caregiver_settings import (
    get_caregiver_colors_for_names,
    get_caregiver_settings_for_names,
    load_caregiver_settings,
    normalize_caregiver_name,
)
from .config.event_settings import load_event_settings
from .tasks import create_events_task, sync_calendar_task

logger = logging.getLogger(__name__)


def get_next_weekday(start_date, weekday):
    """
    Returns the date of the next given weekday after or on start_date.
    weekday: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
    """
    days_ahead = weekday - start_date.weekday()
    if days_ahead < 0:  # Target day already happened this week
        days_ahead += 7
    return start_date + timedelta(days=days_ahead)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def process_json_events(request):
    """
    Process a JSON payload to create or update events in a Google Calendar.
    If the calendar does not exist, it will be created.
    """
    try:
        data = json.loads(request.body)
        calendar_name = data.get("calendar_name")
        events = data.get("events")

        if not calendar_name or not events:
            return JsonResponse(
                {"error": "Missing calendar_name or events"}, status=400
            )

        try:
            credentials = request.user.p2c_profile.google_credentials
        except AttributeError:
            credentials = None
            
        if not credentials:
            return JsonResponse({"error": "Google credentials not found"}, status=401)

        if isinstance(credentials, str):
            credentials = json.loads(credentials)

        calendar_service = GoogleCalendarService(credentials=credentials)

        # Find or create the calendar
        calendar_id = calendar_service.get_calendar_id_by_name(calendar_name)
        if not calendar_id:
            calendar = calendar_service.create_calendar(calendar_name)
            calendar_id = calendar["id"]

        # Process events
        events_data = []
        staff_names = []
        all_settings = load_event_settings()
        now = datetime.now()

        for event in events:
            try:
                day_str = event.get("Day")
                start_time_str = event.get("Start Time")
                end_time_str = event.get("End Time")
                staff_name = event.get("Staff Name")
                recurrence_details = event.get("Recurrence Details")
                ends_on_str = event.get("Ends On (Date)")

                if (
                    not day_str
                    or not start_time_str
                    or not end_time_str
                    or not staff_name
                ):
                    continue

                # Normalize caregiver name
                staff_name = normalize_caregiver_name(staff_name)
                staff_names.append(staff_name)

                # Parse time
                start_time = datetime.strptime(start_time_str, "%H:%M").time()
                end_time = datetime.strptime(end_time_str, "%H:%M").time()

                # Parse date
                if day_str.isdigit():
                    day = int(day_str)
                    start_date = datetime(now.year, now.month, day)
                else:
                    weekdays = {
                        "Mon": 0,
                        "Tue": 1,
                        "Wed": 2,
                        "Thu": 3,
                        "Fri": 4,
                        "Sat": 5,
                        "Sun": 6,
                    }
                    weekday = weekdays.get(day_str)
                    if weekday is None:
                        continue

                    # Check if recurrence_details specifies a start date (e.g., "Every Monday (Starts Dec 8)")
                    starts_match = re.search(
                        r"\(Starts\s+(\w+)\s+(\d+)\)", recurrence_details or ""
                    )
                    if starts_match:
                        month_str = starts_match.group(1)
                        day_num = int(starts_match.group(2))
                        # Parse the explicit start date
                        start_date = datetime.strptime(
                            f"{month_str} {day_num} {now.year}", "%b %d %Y"
                        )
                    else:
                        start_date = get_next_weekday(now, weekday)

                start_datetime = datetime.combine(start_date, start_time)
                end_datetime = datetime.combine(start_date, end_time)

                # Handle recurrence
                recurrence = []
                if recurrence_details and ends_on_str:
                    ends_on_date = datetime.strptime(
                        f"{ends_on_str} {now.year}", "%b %d %Y"
                    )
                    rrule = f"RRULE:FREQ=WEEKLY;UNTIL={ends_on_date.strftime('%Y%m%dT235959Z')}"
                    recurrence.append(rrule)

                beneficiary_settings = all_settings.get(
                    staff_name, all_settings.get("DEFAULT", {})
                )

                events_data.append(
                    {
                        "summary": staff_name,
                        "start": {
                            "dateTime": start_datetime.isoformat(),
                            "timeZone": "Europe/Paris",
                        },
                        "end": {
                            "dateTime": end_datetime.isoformat(),
                            "timeZone": "Europe/Paris",
                        },
                        "recurrence": recurrence,
                        "colorId": None,  # Will be filled with caregiver color below
                        "description": beneficiary_settings.get("description", ""),
                        "location": beneficiary_settings.get("location", ""),
                    }
                )
            except (KeyError, ValueError) as e:
                logger.error(f"Error formatting event: {str(e)}")
                continue

        if not events_data:
            return JsonResponse({"error": "No valid events to process"}, status=400)

        # Apply caregiver colors
        caregiver_colors = get_caregiver_colors_for_names(staff_names)
        for event in events_data:
            staff_name = event["summary"]
            event["colorId"] = caregiver_colors.get(staff_name, "1")

        # Create the task with error handling for connection issues
        try:
            task = create_events_task.delay(
                calendar_id=calendar_id,
                credentials=credentials,
                appointments=events_data,
                update_existing=True,
            )
        except Exception as celery_error:
            logger.error(f"Failed to submit Celery task: {str(celery_error)}")
            return JsonResponse({
                'error': _('Task queue is temporarily unavailable. Please try again in a few moments.')
            }, status=503)

        return JsonResponse(
            {"task_id": task.id, "status": "started", "appointments": events_data}
        )

    except Exception as e:
        logger.error(f"Error in process_json_events: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


def extract_name_from_filename(filename):
    """
    Extract a person's first name from a PDF filename and match it to event settings.
    Example: "Planning mensuel (Paysage) stéphanie.pdf" -> "BASZCZOWSKI, Stéphanie"
    """
    import unicodedata

    if not filename:
        return None

    # Remove .pdf extension and common prefixes
    name = filename.lower()
    name = re.sub(r"\.pdf$", "", name, flags=re.IGNORECASE)
    name = re.sub(
        r"^planning[\s_-]*(mensuel)?[\s_-]*(\(.*?\))?[\s_-]*",
        "",
        name,
        flags=re.IGNORECASE,
    )
    name = name.strip()

    if not name:
        return None

    # Normalize unicode (remove accents for comparison)
    def normalize(s):
        return (
            unicodedata.normalize("NFD", s)
            .encode("ascii", "ignore")
            .decode("ascii")
            .lower()
        )

    name_normalized = normalize(name)

    # Load event settings and find matching name
    all_settings = load_event_settings()

    for full_name in all_settings.keys():
        if full_name == "DEFAULT":
            continue

        # Extract first name from "SURNAME, Firstname" format
        parts = full_name.split(",")
        if len(parts) >= 2:
            first_name = parts[1].strip()
            first_name_normalized = normalize(first_name)

            # Check if the filename contains this first name
            if first_name_normalized and first_name_normalized in name_normalized:
                # Apply name correction before returning
                return normalize_caregiver_name(full_name)

            # Also check surname
            surname = parts[0].strip()
            surname_normalized = normalize(surname)
            if surname_normalized and surname_normalized in name_normalized:
                # Apply name correction before returning
                return normalize_caregiver_name(full_name)

    return None


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def process_pdf_for_display(request):
    """
    Process a PDF file and return appointments for display (no calendar creation).
    Used by the JSON Ingest page to preview appointments from a PDF.
    """
    print("DEBUG: Entering process_pdf_for_display function.")
    logger.debug("Entering process_pdf_for_display function.")
    try:
        if "pdf_file" not in request.FILES:
            return JsonResponse({"error": _("No file provided")}, status=400)

        file = request.FILES["pdf_file"]
        original_filename = file.name

        if not file.size:
            return JsonResponse({"error": "The submitted file is empty"}, status=400)
        if file.content_type != "application/pdf":
            return JsonResponse(
                {"error": "Invalid file type. Only PDF files are allowed"}, status=400
            )
        if file.size > 10 * 1024 * 1024:
            return JsonResponse(
                {"error": "File too large. Maximum size is 10MB"}, status=400
            )

        # Save the file temporarily
        from .models import Document

        document = Document(file=file, user=request.user)
        document.full_clean()
        document.save()

        try:
            from .pdf_processing.parser_factory import PDFParserFactory
            from .pdf_processing.schedule_parser import SchedulePDFParser

            parser = PDFParserFactory.create_parser(document.file.path)
            appointments = parser.extract_schedule_entries(document.file.path)

            # Normalize for SchedulePDFParser
            if isinstance(parser, SchedulePDFParser):
                formatted = []
                for apt in appointments or []:
                    try:
                        formatted.append(
                            {
                                "time": apt["start_time"].strftime("%H:%M")
                                + "-"
                                + apt["end_time"].strftime("%H:%M"),
                                "description": apt.get("beneficiary", "").strip(),
                                "normalized_name": apt.get("beneficiary", "").strip(),
                                "day": apt["start_time"].day,
                                "is_night_shift": apt.get("is_night_shift", False),
                                "start_time": apt["start_time"].strftime("%H:%M"),
                                "end_time": apt["end_time"].strftime("%H:%M"),
                                "duration_minutes": int(
                                    (
                                        apt["end_time"] - apt["start_time"]
                                    ).total_seconds()
                                    / 60
                                ),
                                "month": apt["start_time"].month,
                                "year": apt["start_time"].year,
                                "event_description": apt.get("event_description", ""),
                                "location": apt.get("location", ""),
                            }
                        )
                    except Exception:
                        continue
                appointments = formatted

            # Filter out breaks/repas
            def _is_break_text(text):
                if not text:
                    return False
                text_lower = text.lower()
                return any(
                    term in text_lower
                    for term in ["temps de pause repas", "pause", "repas"]
                )

            appointments = [
                a
                for a in (appointments or [])
                if not _is_break_text(a.get("description", ""))
            ]

            if not appointments:
                return JsonResponse(
                    {"error": "Could not extract any appointments from the PDF"},
                    status=400,
                )

            # Normalize caregiver names (apply corrections like "BASZCZOWSKI, Stephani" -> "BASZCZOWSKI, Stéphanie")
            for apt in appointments:
                if apt.get("description"):
                    apt["description"] = normalize_caregiver_name(apt["description"])
                if apt.get("normalized_name"):
                    apt["normalized_name"] = normalize_caregiver_name(
                        apt["normalized_name"]
                    )

            # Try to extract suggested calendar name from filename
            suggested_calendar_name = extract_name_from_filename(original_filename)

            return JsonResponse(
                {
                    "status": "success",
                    "appointments": appointments,
                    "count": len(appointments),
                    "suggested_calendar_name": suggested_calendar_name,
                }
            )

        finally:
            # Clean up - delete the temporary document
            document.delete()

    except Exception as e:
        logger.error(f"Error in process_pdf_for_display: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def sync_pdf_to_calendar(request):
    """
    Sync appointments from PDF to Google Calendar.
    Creates the calendar if it doesn't exist.
    """
    try:
        data = json.loads(request.body)
        calendar_name = data.get("calendar_name")
        appointments = data.get("appointments")
        source = data.get("source", "pdf")  # 'pdf' or 'json'

        if not calendar_name:
            return JsonResponse({"error": _("Calendar name is required")}, status=400)

        if not appointments or len(appointments) == 0:
            return JsonResponse({"error": _("No appointments to sync")}, status=400)

        try:
            credentials = request.user.p2c_profile.google_credentials
        except AttributeError:
            credentials = None
            
        if not credentials:
            return JsonResponse(
                {
                    "error": "Google credentials not found. Please log in with Google first."
                },
                status=401,
            )

        if isinstance(credentials, str):
            credentials = json.loads(credentials)

        calendar_service = GoogleCalendarService(credentials=credentials)

        # Find or create the calendar
        calendar_id = calendar_service.get_calendar_id_by_name(calendar_name)
        if not calendar_id:
            calendar = calendar_service.create_calendar(calendar_name)
            calendar_id = calendar["id"]

        # Load event settings for descriptions/locations
        all_settings = load_event_settings()

        # Convert PDF appointments to Google Calendar event format
        # First pass: collect all staff names and parse appointments
        events_data = []
        staff_names = []
        for apt in appointments:
            try:
                if source == "pdf":
                    # PDF format has: day, month, year, start_time, end_time, description
                    day = apt.get("day")
                    month = apt.get("month")
                    year = apt.get("year")
                    start_time_str = apt.get("start_time")
                    end_time_str = apt.get("end_time")
                    staff_name = normalize_caregiver_name(
                        apt.get("description", "").strip()
                    )

                    if not all(
                        [day, month, year, start_time_str, end_time_str, staff_name]
                    ):
                        continue

                    start_time = datetime.strptime(start_time_str, "%H:%M").time()
                    end_time = datetime.strptime(end_time_str, "%H:%M").time()
                    start_date = datetime(year, month, day)

                    start_datetime = datetime.combine(start_date, start_time)
                    end_datetime = datetime.combine(start_date, end_time)

                    # Handle overnight shifts
                    if end_datetime <= start_datetime:
                        end_datetime += timedelta(days=1)

                else:
                    # JSON format has: start.dateTime, end.dateTime, summary
                    staff_name = normalize_caregiver_name(
                        apt.get("summary", "").strip()
                    )
                    start_datetime = datetime.fromisoformat(
                        apt["start"]["dateTime"].replace("Z", "+00:00")
                    )
                    end_datetime = datetime.fromisoformat(
                        apt["end"]["dateTime"].replace("Z", "+00:00")
                    )

                staff_names.append(staff_name)

                # Get beneficiary settings for description/location
                beneficiary_settings = all_settings.get(
                    staff_name, all_settings.get("DEFAULT", {})
                )

                # Format expected by sync_calendar_task: start_time/end_time as ISO strings
                events_data.append(
                    {
                        "summary": staff_name,
                        "start_time": start_datetime.isoformat(),
                        "end_time": end_datetime.isoformat(),
                        "colorId": None,  # Will be filled with caregiver color below
                        "description": beneficiary_settings.get("description", ""),
                        "location": beneficiary_settings.get("location", ""),
                    }
                )
            except (KeyError, ValueError) as e:
                logger.error(f"Error formatting appointment: {str(e)}")
                continue

        if not appointments_to_sync:
            return JsonResponse({"error": _("No valid appointments to sync")}, status=400)

        # Apply caregiver colors (same as "Auxiliadom Pending Appointments" uses for beneficiaries)
        caregiver_colors = get_caregiver_colors_for_names(staff_names)
        for event in events_data:
            staff_name = event["summary"]
            event["colorId"] = caregiver_colors.get(staff_name, "1")

        # Determine target month/year from appointments
        # Get the month from the first appointment's start datetime
        first_start = events_data[0]["start_time"]
        first_date = datetime.fromisoformat(first_start.replace("Z", "+00:00"))
        target_month = first_date.month
        target_year = first_date.year

        # Create the Celery task that deletes existing events first, then creates new ones
        # with error handling for connection issues
        try:
            task = sync_calendar_task.delay(
                user_id=request.user.id,
                calendar_id=calendar_id,
                calendar_name=calendar_name,
                credentials=credentials,
                appointments=events_data,
                target_month=target_month,
                target_year=target_year,
            )
        except Exception as celery_error:
            logger.error(f"Failed to submit Celery task: {str(celery_error)}")
            return JsonResponse({
                'error': _('Task queue is temporarily unavailable. Please try again in a few moments.')
            }, status=503)

        return JsonResponse(
            {
                "status": "success",
                "task_id": task.id,
                "appointment_count": len(events_data),
                "calendar_name": calendar_name,
                "target_month": target_month,
                "target_year": target_year,
            }
        )

    except Exception as e:
        logger.error(f"Error in sync_pdf_to_calendar: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def get_caregiver_settings(request):
    """
    Get persistent settings for a list of caregiver names.
    Assigns new settings to caregivers that don't have one yet.

    Request body:
        {"caregiver_names": ["RMOUTI, Soraya", "ARCHER, Christopher", ...]}

    Response:
        {
            "settings": {"RMOUTI, Soraya": {"colorId": "2", ...}, ...},
        }
    """
    try:
        data = json.loads(request.body)
        caregiver_names = data.get("caregiver_names", [])

        if not caregiver_names:
            return JsonResponse({"settings": {}})

        settings = get_caregiver_settings_for_names(caregiver_names)

        return JsonResponse(
            {
                "settings": settings,
            }
        )

    except Exception as e:
        logger.error(f"Error in get_caregiver_settings: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


# Google Calendar color ID to hex mapping
COLOR_ID_TO_HEX = {
    "1": "#ac725e",  # Brown (Cocoa)
    "2": "#33b679",  # Sage (Green)
    "3": "#8e24aa",  # Grape (Purple)
    "4": "#e67c73",  # Flamingo (Pink)
    "5": "#f6c026",  # Banana (Yellow)
    "6": "#f5511d",  # Tangerine (Orange)
    "7": "#039be5",  # Peacock (Blue)
    "8": "#616161",  # Graphite (Gray)
    "9": "#3f51b5",  # Blueberry (Dark Blue)
    "10": "#0b8043",  # Basil (Dark Green)
    "11": "#d60000",  # Tomato (Red)
}


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def calendar_editor_fetch_events(request):
    """
    Fetch events from a Google Calendar for a specific month.
    Used by the Calendar Editor page.

    Request body:
        {"calendar_id": "...", "month": 1, "year": 2025}

    Response:
        {"events": [...], "count": 10}
    """
    try:
        data = json.loads(request.body)
        calendar_id = data.get("calendar_id")
        month = data.get("month")
        year = data.get("year")

        if not calendar_id:
            return JsonResponse({"error": "Calendar ID is required"}, status=400)
        if not month or not year:
            return JsonResponse({"error": "Month and year are required"}, status=400)

        try:
            credentials = request.user.p2c_profile.google_credentials
        except AttributeError:
            credentials = None
            
        if not credentials:
            return JsonResponse({"error": "Google credentials not found"}, status=401)

        if isinstance(credentials, str):
            credentials = json.loads(credentials)

        calendar_service = GoogleCalendarService(credentials=credentials)

        # Fetch events for the month
        events = calendar_service.list_events_in_month(
            year=int(year),
            month=int(month),
            calendar_id=calendar_id,
            single_events=True,  # Expand recurring events to individual instances
        )

        return JsonResponse({"events": events, "count": len(events)})

    except Exception as e:
        logger.error(f"Error in calendar_editor_fetch_events: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def calendar_editor_fetch_latest_snapshot(request):
    """
    Fetch the latest PlanningSnapshot for the current user where the calendar
    name, derived from the source document's filename, is "BASZCZOWSKI, Stéphanie".
    """
    try:
        from .models import PlanningSnapshot
        from .json_views import extract_name_from_filename

        snapshots = PlanningSnapshot.objects.filter(user=request.user).order_by('-created_at').select_related('document')

        # As per user feedback, we are looking for the exact name "BASZCZOWSKI, Stéphanie"
        target_name = "BASZCZOWSKI, Stéphanie"

        for snapshot in snapshots:
            if snapshot.document and snapshot.document.file:
                filename = snapshot.document.file.name
                derived_name = extract_name_from_filename(filename)
                
                if derived_name and derived_name == target_name:
                    return JsonResponse({"snapshot": snapshot.data, "created_at": snapshot.created_at})

        return JsonResponse({"error": "No snapshot found for calendar 'BASZCZOWSKI, Stéphanie'."}, status=404)

    except Exception as e:
        logger.error(f"Error in calendar_editor_fetch_latest_snapshot: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def calendar_editor_submit_changes(request):
    """
    Submit changes to Google Calendar events.
    Used by the Calendar Editor page.

    Request body:
        {
            "calendar_id": "...",
            "changes": [
                {
                    "event_id": "...",
                    "updates": {"summary": "...", "description": "...", "location": "...", "colorId": "...", "start": {...}, "end": {...}},
                    "edit_series": false,
                    "recurring_event_id": null
                },
                ...
            ]
        }

    Response:
        {"updated_count": 5, "errors": [...]}
    """
    try:
        data = json.loads(request.body)
        calendar_id = data.get("calendar_id")
        changes = data.get("changes", [])

        if not calendar_id:
            return JsonResponse({"error": "Calendar ID is required"}, status=400)
        if not changes:
            return JsonResponse({"error": "No changes provided"}, status=400)

        try:
            credentials = request.user.p2c_profile.google_credentials
        except AttributeError:
            credentials = None
            
        if not credentials:
            return JsonResponse({"error": "Google credentials not found"}, status=401)

        if isinstance(credentials, str):
            credentials = json.loads(credentials)

        calendar_service = GoogleCalendarService(credentials=credentials)

        updated_count = 0
        errors = []

        print(
            f"[Calendar Editor] Submitting {len(changes)} changes to calendar {calendar_id}"
        )

        for change in changes:
            try:
                event_id = change.get("event_id")
                updates = change.get("updates", {})
                edit_series = change.get("edit_series", False)
                recurring_event_id = change.get("recurring_event_id")

                if not event_id:
                    errors.append({"error": "Missing event_id"})
                    continue

                # Build the update body
                update_body = {}

                if "summary" in updates:
                    update_body["summary"] = updates["summary"]
                if "description" in updates:
                    update_body["description"] = updates["description"]
                if "location" in updates:
                    update_body["location"] = updates["location"]
                if "colorId" in updates:
                    update_body["colorId"] = updates["colorId"]
                if "start" in updates:
                    update_body["start"] = updates["start"]
                if "end" in updates:
                    update_body["end"] = updates["end"]

                # Determine which event to update
                target_event_id = event_id
                if edit_series and recurring_event_id:
                    # Update the parent recurring event (affects all instances)
                    target_event_id = recurring_event_id

                print(
                    f"[Calendar Editor] Updating event {target_event_id}: {update_body}"
                )

                result = calendar_service.update_event(
                    event_id=target_event_id,
                    event_data=update_body,
                    calendar_id=calendar_id,
                )

                if result.success:
                    updated_count += 1
                    print(
                        f"[Calendar Editor] Successfully updated event {target_event_id}"
                    )
                else:
                    print(
                        f"[Calendar Editor] Failed to update event {target_event_id}: {result.error}"
                    )
                    errors.append(
                        {"event_id": event_id, "error": result.error or "Update failed"}
                    )

            except Exception as e:
                errors.append({"event_id": change.get("event_id"), "error": str(e)})

        return JsonResponse(
            {"updated_count": updated_count, "errors": errors if errors else None}
        )

    except Exception as e:
        logger.error(
            f"Error in calendar_editor_submit_changes: {str(e)}", exc_info=True
        )
        return JsonResponse({"error": str(e)}, status=500)
