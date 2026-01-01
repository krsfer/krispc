"""Views for the P2C application."""

import secrets
import json
import logging
import os
import tempfile
import traceback
from datetime import datetime

import pytz
import requests
from asgiref.sync import sync_to_async
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login, get_user_model
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2.id_token import verify_oauth2_token
from googleapiclient.discovery import build
from rest_framework import status, viewsets
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from .calendar_integration.google_calendar import GoogleCalendarService
from .config.event_settings import EVENT_SETTINGS, load_event_settings, save_event_settings
from .config.caregiver_settings import (
    load_caregiver_settings,
    NAME_CORRECTIONS,
)
from .config.rate_config import load_rate_config, save_rate_config
from .models import CalendarBackup, Document, PlanningSnapshot, P2CUserProfile
from .pdf_processing.auxiliadom_parser import AuxiliadomPDFParser
from .pdf_processing.schedule_parser import SchedulePDFParser
from .serializers import DocumentSerializer
from .services.conversion_service import PDFToCalendarService
from .tasks import create_events_task, delete_events_task, restore_backup_task
from .text_processing.auxiliadom_parser import AuxiliadomParser
from .utils.oauth_utils import get_oauth_scopes_string
from .pdf_processing.parser_factory import PDFParserFactory
from .utils.time_gaps import add_gap_warnings_to_appointments
from .utils.diff import diff_snapshots
from .encryption_utils import encrypt_credentials, decrypt_credentials

# Add logger configuration
logger = logging.getLogger(__name__)

# Event settings


def get_ordinal_suffix(day):
    """Add ordinal suffixes (st, nd, rd, th) to day numbers."""
    if 11 <= day <= 13:  # Handle special cases like 11th, 12th, 13th
        return "th"
    last_digit = day % 10
    if last_digit == 1:
        return "st"
    elif last_digit == 2:
        return "nd"
    elif last_digit == 3:
        return "rd"
    else:
        return "th"


def format_datetime(dt_str):
    """Format datetime string with ordinal day suffix."""
    dt = datetime.fromisoformat(dt_str)
    # Convert to Paris timezone
    paris_tz = pytz.timezone("Europe/Paris")  # Use pytz directly
    dt = dt.astimezone(paris_tz)

    day = dt.day
    ordinal_day = f"{day}{get_ordinal_suffix(day)}"
    return dt.strftime(f"%H:%M:%S, %A {ordinal_day} %B, %Y")


def get_localized_month_name(month_number):
    """Convert month number to localized month name."""
    months = {
        1: _("January"), 2: _("February"), 3: _("March"), 4: _("April"),
        5: _("May"), 6: _("June"), 7: _("July"), 8: _("August"),
        9: _("September"), 10: _("October"), 11: _("November"), 12: _("December")
    }
    return months.get(month_number, '')


def home(request):
    """Home page view."""
    if not hasattr(settings, "GOOGLE_OAUTH2_CLIENT_ID"):
        messages.error(
            request,
            _("Google OAuth configuration is missing. Please contact the administrator."),
        )

    client_id = getattr(settings, "GOOGLE_OAUTH2_CLIENT_ID", None)

    # Generate state for CSRF protection if it doesn't exist
    state = request.session.get('oauth_state')
    if not state:
        state = secrets.token_hex(16)
        request.session['oauth_state'] = state

    # Construct redirect URI dynamically based on request domain
    redirect_uri = request.build_absolute_uri('/login/google/')

    context = {
        "google_oauth2_client_id": client_id,
        "google_oauth2_redirect_uri": redirect_uri,
        "site_url": settings.SITE_URL,
        "event_settings": load_event_settings(),
        "oauth_scopes_string": get_oauth_scopes_string(),
        "gap_warnings": [],
        "oauth_state": state,
    }
    # Prefill textarea with last submitted text (if any)
    context["schedule_text"] = request.session.get("text_content")

    if request.user.is_authenticated:
        # Prefer text-imported appointments stored in session to avoid stale PDF data
        session_appts = request.session.get("appointments")
        source_type = request.session.get("source_type")
        if session_appts:
            try:
                # Parse if stored as JSON string
                if isinstance(session_appts, str):
                    session_appts = json.loads(session_appts)
                if isinstance(session_appts, list) and session_appts:
                    # Populate context from session appointments
                    appointments, gap_warnings = add_gap_warnings_to_appointments(session_appts)
                    context["appointments"] = appointments
                    context["gap_warnings"] = gap_warnings
                    if source_type == 'pdf':
                        context['document_id'] = request.session.get('document_id')
                        context["uploaded_filename"] = request.session.get("uploaded_filename")
                    else:
                        context["text_imported"] = True
                        context["document_id"] = None  # ensure PDF actions are not shown
                        context["uploaded_filename"] = None

                    # Compute total duration
                    total_minutes = 0
                    for apt in session_appts:
                        minutes = apt.get("duration_minutes")
                        if isinstance(minutes, int):
                            total_minutes += minutes
                        else:
                            sh = apt.get("start_time")
                            eh = apt.get("end_time")
                            if sh and eh:
                                try:
                                    sh_h, sh_m = map(int, sh.split(":"))
                                    eh_h, eh_m = map(int, eh.split(":"))
                                    smins = sh_h * 60 + sh_m
                                    emins = eh_h * 60 + eh_m
                                    if emins < smins:  # handle overnight
                                        emins += 24 * 60
                                    total_minutes += emins - smins
                                except Exception:
                                    pass
                    context["total_duration"] = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"

                    # Derive month/year metadata if present on items
                    first = session_appts[0]
                    cur_month = first.get("month")
                    cur_year = first.get("year")
                    
                    # Use session metadata if present, otherwise derive from appointments
                    current_month = request.session.get("current_month")
                    context["current_year"] = request.session.get("current_year")

                    if current_month:
                        context["current_month"] = current_month
                        context["current_month_name"] = get_localized_month_name(current_month)
                    elif isinstance(cur_month, int):
                        context["current_month"] = cur_month
                        context["current_month_name"] = get_localized_month_name(cur_month)
                    
                    if not context.get("current_year") and isinstance(cur_year, int):
                        context["current_year"] = cur_year
                    if isinstance(context.get("current_month"), int) and isinstance(context.get("current_year"), int):
                        context["current_month_year"] = f"{context['current_year']}-{context['current_month']:02d}"
                    # Default agency label when parsing from text
                    context["agency_name"] = context.get("agency_name") or "Your"
                else:
                    # If session appts are empty, fall back to PDF branch below
                    session_appts = None
            except Exception:
                # If session parsing fails, fall back to PDF branch
                session_appts = None

        if not session_appts:
            # Get user's latest unprocessed PDF document
            documents = Document.objects.filter(user=request.user, processed=False)
            if not documents:
                # If no unprocessed ones, just get the latest one (even if processed)
                documents = Document.objects.filter(user=request.user)
            
            if documents:
                try:
                    # Get appointments from the latest document
                    latest_document = documents.latest("uploaded_at")

                    # Check if file exists
                    if not latest_document.file or not os.path.exists(
                        latest_document.file.path
                    ):
                        # File is missing, delete the document record
                        latest_document.delete()
                        messages.warning(
                            request,
                            _("Previous upload was incomplete. Please upload your PDF again."),
                        )
                        return render(request, "home.html", context)

                    # Use appropriate parser based on PDF content
                    parser = PDFParserFactory.create_parser(latest_document.file.path)
                    appointments = parser.extract_schedule_entries(
                        latest_document.file.path
                    )

                    # Convert to Plumber format if needed
                    if isinstance(parser, SchedulePDFParser):
                        formatted_appointments = []
                        for apt in appointments:
                            formatted_appointments.append(
                                {
                                    "time": apt["start_time"].strftime("%H:%M")
                                    + "-"
                                    + apt["end_time"].strftime("%H:%M"),
                                    "description": apt["beneficiary"],
                                    "day": apt["start_time"].day,
                                    "is_night_shift": apt["is_night_shift"],
                                    "start_time": apt["start_time"].strftime("%H:%M"),
                                    "end_time": apt["end_time"].strftime("%H:%M"),
                                    "duration_minutes": apt["duration_minutes"],
                                    "month": apt["start_time"].month,
                                    "year": apt["start_time"].year,
                                }
                            )
                        appointments = formatted_appointments
                    else:
                        # Filter out lunch break appointments for AuxiliadomPDFParser
                        appointments = [
                            apt
                            for apt in appointments
                            if apt["description"].strip() != "Temps de pause repas"
                        ]

                    # Calculate total duration for all appointments
                    total_duration_minutes = 0
                    for apt in appointments:
                        time_match = parser.time_pattern.search(apt["description"])
                        if time_match:
                            start_hour, start_min, end_hour, end_min = map(
                                int, time_match.groups()
                            )
                            start_minutes = start_hour * 60 + start_min
                            end_minutes = end_hour * 60 + end_min
                            if end_minutes < start_minutes:  # Handle overnight shifts
                                end_minutes += 24 * 60
                            total_duration_minutes += end_minutes - start_minutes

                    # Format total duration
                    total_hours = total_duration_minutes // 60
                    total_mins = total_duration_minutes % 60
                    total_duration = f"{total_hours:02d}:{total_mins:02d}"

                    appointments, gap_warnings = add_gap_warnings_to_appointments(appointments)
                    context["appointments"] = appointments
                    context["gap_warnings"] = gap_warnings
                    context["total_duration"] = total_duration
                    context["document_id"] = latest_document.id if documents else None
                    context["current_month"] = parser._current_month
                    context["current_month_name"] = get_localized_month_name(parser._current_month)
                    context["current_year"] = parser._current_year
                    context["agency_name"] = (
                        "Auxiliadom"
                        if isinstance(parser, AuxiliadomPDFParser)
                        else "Unknown Agency"
                    )
                    context['current_month_year'] = f"{parser._current_year}-{parser._current_month:02d}"  # Format: "YYYY-MM"
                    context["uploaded_filename"] = os.path.basename(latest_document.file.name) if latest_document.file else None
                    # Store appointments in session for create_events view
                    request.session["appointments"] = appointments
                    request.session["document_id"] = context["document_id"]
                    request.session["source_type"] = "pdf"
                except Exception as e:
                    messages.error(
                        request, _("Error processing the PDF. Please try uploading again.")
                    )

                # If appointments were imported from text, populate context from session
                if not context.get("appointments") and request.session.get("appointments"):
                    try:
                        appts = request.session.get("appointments")
                        # If stored as JSON string, parse it
                        if isinstance(appts, str):
                            appts = json.loads(appts)
                        if isinstance(appts, list) and appts:
                            appointments, gap_warnings = add_gap_warnings_to_appointments(appts)
                            context["appointments"] = appointments
                            context["gap_warnings"] = gap_warnings

                            # Compute total duration
                            total_minutes = 0
                            for apt in appts:
                                minutes = apt.get("duration_minutes")
                                if isinstance(minutes, int):
                                    total_minutes += minutes
                                else:
                                    sh = apt.get("start_time")
                                    eh = apt.get("end_time")
                                    if sh and eh:
                                        try:
                                            sh_h, sh_m = map(int, sh.split(":"))
                                            eh_h, eh_m = map(int, eh.split(":"))
                                            smins = sh_h * 60 + sh_m
                                            emins = eh_h * 60 + eh_m
                                            if emins < smins:
                                                emins += 24 * 60
                                            total_minutes += emins - smins
                                        except Exception:
                                            pass
                            context["total_duration"] = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"

                            # Derive month/year metadata if present
                            first = appts[0]
                            cur_month = first.get("month")
                            cur_year = first.get("year")
                            if isinstance(cur_month, int):
                                context["current_month"] = cur_month
                                context["current_month_name"] = get_localized_month_name(cur_month)
                            if isinstance(cur_year, int):
                                context["current_year"] = cur_year
                            if isinstance(cur_month, int) and isinstance(cur_year, int):
                                context["current_month_year"] = f"{cur_year}-{cur_month:02d}"

                            # Defaults and flags
                            context["agency_name"] = context.get("agency_name") or "Your"
                            context["text_imported"] = True
                    except Exception:
                        # If session parsing fails, ignore and render without appointments
                        pass

    return render(request, "home.html", context)


@require_http_methods(["POST", "GET"])
@csrf_exempt  # Exempt this view from CSRF protection as Google handles security
def google_login(request):
    """Handle Google OAuth login."""
    try:
        if request.method == "POST":
            # Try to get data from request body first
            try:
                if request.content_type == "application/json":
                    if isinstance(request.body, bytes):
                        data = json.loads(request.body.decode("utf-8"))
                    else:
                        data = json.loads(request.body)
                else:
                    data = request.POST
            except (json.JSONDecodeError, UnicodeDecodeError):
                data = request.POST

            token = data.get("credential")
            if not token:
                return JsonResponse({"error": "No token provided"}, status=400)

            try:
                # Verify token
                idinfo = verify_oauth2_token(token, Request())

                # Verify issuer
                if not idinfo.get("iss", "").endswith(
                    ("accounts.google.com", "google.com")
                ):
                    return JsonResponse({"error": "Invalid token issuer"}, status=400)

                # Get or create user
                username = idinfo["email"].split("@")[0]
                name_parts = idinfo.get("name", "").split(" ", 1)
                first_name = name_parts[0] if name_parts else ""
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                User = get_user_model()
                user, created = User.objects.get_or_create(
                    email=idinfo["email"],
                    defaults={
                        "username": username,
                        "first_name": first_name,
                        "last_name": last_name,
                    },
                )
                
                # Get or create profile
                profile, _ = P2CUserProfile.objects.get_or_create(user=user)
                profile.profile_picture = idinfo.get("picture", "")
                profile.save()

                # Update user info for existing users
                if not created:
                    user.first_name = first_name
                    user.last_name = last_name
                    user.save()

                # Log the user in
                login(request, user)

                return JsonResponse({"success": True, "redirect": settings.SITE_URL})

            except ValueError as e:
                error_msg = str(e)
                if "Token expired" in error_msg:
                    return JsonResponse({"error": "Token expired"}, status=400)
                return JsonResponse({"error": "Invalid token"}, status=400)
            except requests.RequestException as e:
                return JsonResponse(
                    {"error": f"Token exchange failed: {str(e)}"},
                    status=400
                )

        elif request.method == "GET":
            # --- CSRF Protection: Validate state token ---
            received_state = request.GET.get("state")
            expected_state = request.session.get("oauth_state")

            if not received_state or not expected_state or received_state != expected_state:
                return JsonResponse({
                    "error": "Invalid state parameter. CSRF attack suspected (DEBUG MODE)",
                    "received": received_state,
                    "expected": expected_state,
                    "session_id": request.session.session_key
                }, status=400)

            # Handle OAuth code flow
            code = request.GET.get("code")
            if not code:
                return JsonResponse(
                    {"error": "No authorization code provided"}, status=400
                )

            # Exchange code for tokens
            # Construct redirect URI dynamically to match the one used in authorization
            redirect_uri = request.build_absolute_uri('/login/google/')

            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "code": code,
                "client_id": settings.GOOGLE_OAUTH2_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH2_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
                "scope": get_oauth_scopes_string(),
            }

            try:
                # Make POST request to exchange code for tokens
                response = requests.post(token_url, data=token_data)
                response.raise_for_status()

                # Parse response
                token_info = response.json()

                # Create credentials object
                credentials = Credentials(
                    token=token_info["access_token"],
                    refresh_token=token_info.get("refresh_token"),
                    token_uri=token_url,
                    client_id=settings.GOOGLE_OAUTH2_CLIENT_ID,
                    client_secret=settings.GOOGLE_OAUTH2_CLIENT_SECRET,
                    scopes=token_info["scope"].split(" "),
                )

                # Convert credentials to JSON with additional fields
                credentials_json = {
                    "token": token_info["access_token"],
                    "refresh_token": token_info.get("refresh_token"),
                    "token_uri": token_url,
                    "client_id": settings.GOOGLE_OAUTH2_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH2_CLIENT_SECRET,
                    "scopes": token_info["scope"].split(" "),
                    "access_token": token_info[
                        "access_token"
                    ],  # Required by GoogleCalendarService
                }

                # Get user info using the access token
                userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
                headers = {"Authorization": f'Bearer {token_info["access_token"]}'}
                userinfo_response = requests.get(userinfo_url, headers=headers)
                userinfo_response.raise_for_status()
                userinfo = userinfo_response.json()

                # Get or create user
                username = userinfo["email"].split("@")[0]
                name_parts = userinfo.get("name", "").split(" ", 1)
                first_name = name_parts[0] if name_parts else ""
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                User = get_user_model()
                user, created = User.objects.get_or_create(
                    email=userinfo["email"],
                    defaults={
                        "username": username,
                        "first_name": first_name,
                        "last_name": last_name,
                    },
                )
                
                # Get or create profile
                profile, _ = P2CUserProfile.objects.get_or_create(user=user)
                profile.profile_picture = userinfo.get("picture", "")

                # Update user info for existing users
                if not created:
                    user.first_name = first_name
                    user.last_name = last_name
                    user.save()

                # Store encrypted credentials
                profile.google_credentials = encrypt_credentials(json.dumps(credentials_json))
                profile.save()

                # Log the user in
                login(request, user)

                return redirect(settings.SITE_URL)

            except requests.RequestException as e:
                return JsonResponse(
                    {"error": f"Token exchange failed: {str(e)}"},
                    status=400
                )

    except Exception as e:
        return JsonResponse({"error": "Authentication failed"}, status=400)


@login_required
@require_http_methods(["POST"])
def upload_pdf(request):
    """Handle PDF upload."""
    if "pdf_file" not in request.FILES:
        messages.error(request, _("No file provided"))
        return redirect("home")

    file = request.FILES["pdf_file"]

    # Check for empty file
    if not file.size:
        messages.error(request, _("The submitted file is empty."))
        return redirect("home")

    # Validate file type
    if not file.content_type == "application/pdf":
        messages.error(request, _("Invalid file type. Only PDF files are allowed"))
        return redirect("home")

    if file.size > 10 * 1024 * 1024:  # 10MB limit
        messages.error(request, _("File too large. Maximum size is 10.0MB"))
        return redirect("home")

    try:
        document = Document(file=file, user=request.user)
        document.full_clean()  # Validate the model
        document.save()

        # Clear any existing session appointments to ensure we show the new ones from this PDF
        if 'appointments' in request.session:
            del request.session['appointments']
        if 'document_id' in request.session:
            del request.session['document_id']
        if 'source_type' in request.session:
            del request.session['source_type']

        # Determine which parser to use
        parser = PDFParserFactory.create_parser(document.file.path)
        parser_name = parser.__class__.__name__

        # Try to parse the document
        appointments = parser.extract_schedule_entries(document.file.path)

        # Check for unknown beneficiaries if parser supports it
        if hasattr(parser, 'get_unknown_beneficiaries'):
            unknown_beneficiaries = parser.get_unknown_beneficiaries()
            if unknown_beneficiaries:
                # Log unknown beneficiaries
                logger.info("Unknown beneficiaries detected in PDF %s:", document.file.name)

                # Separate real beneficiaries from administrative entries
                real_beneficiaries = {}
                for name, info in unknown_beneficiaries.items():
                    logger.info("  - %s: Tel=%s, Location=%s", name, info['telephone'], info['location'])

                    # Only add entries with valid phone numbers (real beneficiaries)
                    if info['telephone'] != "Not found":
                        real_beneficiaries[name] = info

                # Automatically add real beneficiaries to event_settings_data.json
                if real_beneficiaries:
                    from .utils.beneficiary_utils import add_beneficiaries_to_settings
                    add_beneficiaries_to_settings(real_beneficiaries)

                    # Reload event settings to pick up the new entries
                    global EVENT_SETTINGS
                    EVENT_SETTINGS = load_event_settings()

        if not appointments:
            document.delete()  # Clean up invalid document
            messages.error(
                request,
                f"[{parser_name}] Could not extract any appointments from the PDF. Please check the file format.",
            )
            return redirect("home")

        # Store in session immediately to ensure home view picks up this exact data
        request.session["appointments"] = appointments
        request.session["document_id"] = document.id
        request.session["source_type"] = "pdf"
        request.session["uploaded_filename"] = file.name
        
        # Store month and year for consistent display across pages (e.g. Pay Calculator)
        if hasattr(parser, '_current_month') and parser._current_month:
            request.session["current_month"] = parser._current_month
        if hasattr(parser, '_current_year') and parser._current_year:
            request.session["current_year"] = parser._current_year

        # Count actual appointments (excluding breaks and pauses)
        if parser_name == "SchedulePDFParser":
            # The parser already filters out breaks
            actual_appointments = len(appointments)
        else:
            # Auxiliadom parser needs filtering
            actual_appointments = sum(
                1
                for appt in appointments
                if not any(
                    word.lower() in appt["description"].lower()
                    for word in ["pause", "repas", "temps"]
                )
            )

        messages.success(
            request,
            _("[%(parser)s] PDF uploaded successfully. Found %(count)d appointments.")
            % {"parser": parser_name, "count": actual_appointments},
        )
        return redirect("home")

    except ValidationError as e:
        messages.error(request, str(e))
    except ValueError as e:
        messages.error(request, _("[Unknown Parser] %(error)s") % {"error": str(e)})
    except Exception as e:
        try:
            parser_name = parser.__class__.__name__
            messages.error(
                request,
                _("[%(parser)s] Upload failed. %(error)s")
                % {"parser": parser_name, "error": str(e)},
            )
        except:
            messages.error(
                request,
                _("[Unknown Parser] Upload failed. Please make sure the file is a valid PDF schedule."),
            )

    return redirect("home")


@login_required
@require_http_methods(["POST"])
def process_text(request):
    """Handle text input processing."""
    if "schedule_text" not in request.POST or not request.POST["schedule_text"].strip():
        messages.error(request, _("No text provided"))
        return redirect("home")

    schedule_text = request.POST["schedule_text"]

    try:
        # Create a temporary file to store the text
        with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False, encoding='utf-8') as temp_file:
            temp_file.write(schedule_text)
            temp_file_path = temp_file.name

        try:
            # Read the file content
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()

            # Initialize the parser
            parser = AuxiliadomParser()

            # Parse the text content
            appointments = parser.parse_schedule(file_content)

            # Store the processed data in the session
            request.session['appointments'] = json.dumps(appointments)
            request.session['source_type'] = 'text'
            
            # Store month and year metadata from the first appointment if available
            if appointments and len(appointments) > 0:
                first = appointments[0]
                m = first.get('month')
                y = first.get('year')
                if m:
                    request.session["current_month"] = m
                if y:
                    request.session["current_year"] = y

            # Create a temporary document ID for the session
            request.session['temporary_document_id'] = f"text_input_{timezone.now().strftime('%Y%m%d_%H%M%S')}"

            # Store the text content in the session
            request.session['text_content'] = schedule_text

            # Add a success message
            messages.success(
                request,
                _("Successfully processed %(count)d appointments from text input.")
                % {"count": len(appointments)},
            )

            # Redirect to home; it will populate schedule and metadata from session
            return redirect("home")

        finally:
            # Clean up the temporary file
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.error(f"Error deleting temporary file: {str(e)}")

    except Exception as e:
        logger.error(f"Error processing text: {str(e)}")
        logger.error(traceback.format_exc())
        messages.error(
            request, _("Error processing text: %(error)s") % {"error": str(e)}
        )

    return redirect("home")


class DocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for handling PDF document uploads and processing."""

    permission_classes = [IsAuthenticated]
    authentication_classes = [BasicAuthentication, SessionAuthentication]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    renderer_classes = [JSONRenderer]
    serializer_class = DocumentSerializer
    queryset = Document.objects.all()
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    schema = None  # Disable schema generation for this viewset

    def get_queryset(self):
        """Override get_queryset to filter by user."""
        return Document.objects.filter(user=self.request.user)

    def create(self, request):
        """Upload a new PDF document."""
        try:
            # Validate file using serializer
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                error_msg = next(iter(serializer.errors.values()))[0]
                return Response(
                    {"error": str(error_msg)}, status=status.HTTP_400_BAD_REQUEST
                )

            # Only create document if validation passes
            document = serializer.save(user=request.user)

            return Response(
                {"document_id": document.id}, status=status.HTTP_201_CREATED
            )

        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": "Error uploading file"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def process(self, request, pk=None):
        """Process a PDF document and create calendar events.

        Parameters:
            batch (bool): If True, process events in batch mode for better performance.
                        Default is False.
        """
        try:
            # Get document with row lock
            with transaction.atomic():
                try:
                    document = Document.objects.select_for_update(nowait=True).get(
                        id=pk, user=request.user
                    )
                except Document.DoesNotExist:
                    return Response(
                        {"error": "Document not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Check if file exists
                if not document.file or not os.path.exists(document.file.path):
                    return Response(
                        {"error": "File not found"}, status=status.HTTP_404_NOT_FOUND
                    )

                if document.processed:
                    # Document was already processed
                    return Response(
                        {"error": "Document already processed"},
                        status=status.HTTP_409_CONFLICT,
                    )

                # Lock the document for processing
                document.processing = True
                document.status = Document.Status.PROCESSING
                document.save()

                try:
                    # Initialize services
                    parser = PDFParserFactory.create_parser(document.file.path)

                    # Extract schedule entries first to check for unknown beneficiaries
                    schedule_entries = parser.extract_schedule_entries(document.file.path)

                    # Check for unknown beneficiaries if parser supports it
                    if hasattr(parser, 'get_unknown_beneficiaries'):
                        unknown_beneficiaries = parser.get_unknown_beneficiaries()
                        if unknown_beneficiaries:
                            # Log unknown beneficiaries
                            logger.info("Unknown beneficiaries detected in PDF %s:", document.file.name)

                            # Separate real beneficiaries from administrative entries
                            real_beneficiaries = {}
                            for name, info in unknown_beneficiaries.items():
                                logger.info("  - %s: Tel=%s, Location=%s", name, info['telephone'], info['location'])

                                # Only add entries with valid phone numbers (real beneficiaries)
                                if info['telephone'] != "Not found":
                                    real_beneficiaries[name] = info

                            # Automatically add real beneficiaries to event_settings_data.json
                            if real_beneficiaries:
                                from .utils.beneficiary_utils import (
                                    add_beneficiaries_to_settings,
                                )
                                add_beneficiaries_to_settings(real_beneficiaries)

                    # Safely get and decrypt Google credentials
                    try:
                        encrypted_creds = request.user.p2c_profile.google_credentials
                    except (AttributeError, P2CUserProfile.DoesNotExist):
                        encrypted_creds = None

                    if not encrypted_creds:
                        return Response(
                            {"error": "Google credentials not found"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    try:
                        decrypted_creds_json = decrypt_credentials(encrypted_creds)
                        google_credentials = json.loads(decrypted_creds_json)
                    except Exception:
                        return Response(
                            {"error": "Invalid or corrupted Google credentials. Please re-authenticate."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    calendar_service = GoogleCalendarService(
                        credentials=google_credentials
                    )
                    conversion_service = PDFToCalendarService(parser, calendar_service)

                    # Get batch mode parameter
                    use_batch = request.data.get("batch", False)

                    # Process the document
                    result = conversion_service.process_pdf_and_create_events(
                        document.file.path, use_batch=use_batch
                    )

                    # Use the success flag from the result
                    if result.success:
                        document.processed = True  # Mark as processed
                        document.processing = (
                            False  # Make sure to set processing to False
                        )
                        document.status = Document.Status.COMPLETED
                        document.save()

                        # Extract unique names and their colors from the events
                        # Use a set to track processed names and avoid duplicates
                        processed_names = set()
                        pending_appointments = {}
                        for event in result.events_created:
                            if "description" in event:
                                name = event["description"].split("\n")[0].strip()
                                # Only process each name once
                                if name and name not in processed_names:
                                    processed_names.add(name)
                                    event_settings = EVENT_SETTINGS.get(
                                        name, EVENT_SETTINGS.get("DEFAULT", {})
                                    )
                                    pending_appointments[name] = {
                                        "colorId": event_settings.get("colorId"),
                                        "description": event_settings.get(
                                            "description", ""
                                        ),
                                        "location": event_settings.get("location", ""),
                                    }

                        return Response(
                            {
                                "task_id": str(document.id),
                                "events_created": (
                                    len(result.events_created)
                                    if result.events_created
                                    else 0
                                ),
                                "failed_events": (
                                    result.failed_events
                                    if result.failed_events
                                    else None
                                ),
                                "success": True,
                                "batch_mode": use_batch,
                                "pending_appointments": pending_appointments,
                            },
                            status=status.HTTP_200_OK,
                        )
                    else:
                        error_message = result.error or "Failed to process document"
                        document.error_message = error_message
                        document.processing = False
                        document.status = Document.Status.ERROR
                        document.save()
                        return Response(
                            {
                                "error": error_message,
                                "success": False,
                                "events_created": (
                                    len(result.events_created)
                                    if result.events_created
                                    else 0
                                ),
                                "failed_events": (
                                    result.failed_events
                                    if result.failed_events
                                    else None
                                ),
                                "batch_mode": use_batch,
                            },
                            status=status.HTTP_200_OK,
                        )
                except Exception as e:
                    document.error_message = str(e)
                    document.processing = False  # Make sure to set processing to False
                    document.status = Document.Status.ERROR
                    document.save()
                    return Response(
                        {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                finally:
                    # Always unlock the document, even if there was an error
                    if not document.processed:
                        document.processing = False
                        document.status = Document.Status.ERROR
                        document.save()

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        """Get the processing status of a document."""
        try:
            document = Document.objects.get(id=pk, user=request.user)
            return Response(
                {
                    "status": {
                        "processed": document.processed,
                        "processing": document.processing,
                        "error": document.error_message,
                    }
                },
                status=status.HTTP_200_OK,
            )
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Create async versions of functions
async_redirect = sync_to_async(redirect)
async_messages_error = sync_to_async(messages.error)
async_messages_success = sync_to_async(messages.success)
async_document_save = sync_to_async(lambda x: x.save())
async_user_save = sync_to_async(lambda x: x.save())

@login_required
@require_http_methods(["POST"])
def create_events(request, document_id):
    """Create calendar events from a processed document."""
    try:
        logger.info("Create events called with document_id: %s", document_id)
        calendar_id = request.POST.get('calendar_id')

        if not calendar_id:
            logger.error("No calendar_id provided")
            return JsonResponse({"error": _("Please select a calendar")}, status=400)

        # Get appointments from session
        appointments = request.session.get('appointments', [])
        if not appointments:
            logger.error("No appointments found in session")
            return JsonResponse({"error": _("No appointments found")}, status=400)

        # Parse if stored as JSON string
        if isinstance(appointments, str):
            try:
                appointments = json.loads(appointments)
            except Exception as e:
                logger.error(f"Error parsing appointments from session: {str(e)}")
                return JsonResponse({"error": _("Invalid session data")}, status=400)

        # Get and decrypt the credentials from the user model
        try:
            encrypted_creds = request.user.p2c_profile.google_credentials
        except (AttributeError, P2CUserProfile.DoesNotExist):
            encrypted_creds = None
            
        if not encrypted_creds:
            return JsonResponse({'error': _('Google credentials not found')}, status=401)

        try:
            decrypted_creds_json = decrypt_credentials(encrypted_creds)
            credentials = json.loads(decrypted_creds_json)
        except Exception:
            return JsonResponse(
                {'error': _('Invalid or corrupted Google credentials. Please re-authenticate.')},
                status=401
            )

        # Create formatted datetime as now using "YYYY-MM-DDTHH:mm"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        event_settings = load_event_settings()

        # Filter out breaks and format appointments for the task
        events_data = []
        for appointment in appointments:
            logger.info("######## Appointment: %s", json.dumps(appointment))
            try:
                description = appointment.get('description', '').lower()

                # Skip breaks
                if ('temps de pause repas' in description or
                    'pause' in description or
                    'repas' in description):
                    continue

                # Use the normalized name from the appointment
                name = appointment.get('normalized_name', '')
                settings = event_settings.get(name, event_settings.get("DEFAULT", {}))

                # Format the datetime strings
                start_time = f"{appointment.get('year')}-{appointment.get('month'):02d}-{appointment.get('day'):02d}T{appointment.get('start_time')}:00"
                end_time = f"{appointment.get('year')}-{appointment.get('month'):02d}-{appointment.get('day'):02d}T{appointment.get('end_time')}:00"

                # Ensure colorId is a string and has a default value
                colorId = str(appointment.get('colorId') or settings.get('colorId') or '1')
                event_description = appointment.get('event_description') or settings.get('description') or 'no description'
                location = appointment.get('location') or settings.get('location') or 'no location'

                events_data.append({
                    'summary': name,
                    'start_time': start_time,
                    'end_time': end_time,
                    'colorId': colorId,
                    'description': f"{now}\n{event_description}",
                    'location': location
                })

                logger.info("######## Event data: %s", json.dumps(events_data[-1]))

            except (KeyError, ValueError) as e:
                logger.error(f"Error formatting appointment: {str(e)}")
                continue


        if not events_data:
            return JsonResponse({"error": "No valid appointments to process"}, status=400)

        # Create the task
        task = create_events_task.delay(
            calendar_id=calendar_id,
            credentials=credentials,
            appointments=events_data
        )

        logger.info("Task created with ID: %s", task.id)

        # Mark document as processed if it's a real PDF document
        if document_id and document_id != 0:
            try:
                document = Document.objects.get(id=document_id, user=request.user)
                document.processed = True
                document.status = Document.Status.COMPLETED
                document.save()
            except Document.DoesNotExist:
                pass

        return JsonResponse({
            'task_id': task.id,
            'status': 'started'
        })

    except Exception as e:
        logger.error(f"Error in create_events: {str(e)}", exc_info=True)
        return JsonResponse(
            {'error': str(e)}
        , status=500)


@login_required
def get_calendars(request):
    """Get list of user's Google Calendars."""
    try:
        # Get and decrypt credentials
        try:
            encrypted_creds = request.user.p2c_profile.google_credentials
        except (AttributeError, P2CUserProfile.DoesNotExist):
            encrypted_creds = None

        if not encrypted_creds:
            return JsonResponse({"error": "No Google credentials found"}, status=400)

        try:
            decrypted_creds_json = decrypt_credentials(encrypted_creds)
            credentials = json.loads(decrypted_creds_json)
        except Exception:
            return JsonResponse(
                {"error": "Invalid or corrupted Google credentials. Please re-authenticate."},
                status=400
            )

        calendar_service = GoogleCalendarService(credentials=credentials)
        calendars = calendar_service.get_calendar_list()

        # Add last selected calendar info
        last_calendar_id = None
        if hasattr(request.user, 'p2c_profile'):
            last_calendar_id = request.user.p2c_profile.last_calendar_id

        response_data = {
            "calendars": calendars,
            "last_calendar_id": last_calendar_id,
        }

        response = JsonResponse(response_data)
        return response

    except Exception as e:
        print(f"Error fetching calendars: {str(e)}\n{traceback.format_exc()}")
        return JsonResponse({"error": str(e)}, status=400)


@login_required
@require_http_methods(["POST"])
def create_calendar(request):
    """Create a new Google Calendar."""
    try:
        data = json.loads(request.body)
        name = data.get('name')
        if not name:
            return JsonResponse({'error': 'Calendar name is required'}, status=400)

        # Get and decrypt credentials
        try:
            encrypted_creds = request.user.p2c_profile.google_credentials
        except (AttributeError, P2CUserProfile.DoesNotExist):
            encrypted_creds = None

        if not encrypted_creds:
            return JsonResponse({"error": "No Google credentials found"}, status=401)

        try:
            decrypted_creds_json = decrypt_credentials(encrypted_creds)
            credentials = json.loads(decrypted_creds_json)
        except Exception:
            return JsonResponse(
                {"error": "Invalid or corrupted Google credentials. Please re-authenticate."},
                status=401
            )

        calendar_service = GoogleCalendarService(credentials=credentials)
        calendar = calendar_service.create_calendar(name)
        
        return JsonResponse({
            'status': 'success',
            'id': calendar['id'],
            'summary': calendar['summary']
        })

    except Exception as e:
        logger.error(f"Error creating calendar: {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def event_settings_view(request):
    """Display and manage event settings."""
    from .config.caregiver_settings import (
        load_caregiver_settings,
    )

    # Always load settings to ensure we have the latest data
    EVENT_SETTINGS.clear()
    EVENT_SETTINGS.update(load_event_settings())

    # Load caregiver settings for display
    caregiver_settings = load_caregiver_settings()

    if request.method == "GET":
        if request.headers.get("Accept") == "application/json":
            return JsonResponse(
                {
                    "event_settings": EVENT_SETTINGS,
                    "caregiver_settings": caregiver_settings,
                    "name_corrections": NAME_CORRECTIONS,
                }
            )
        return render(
            request,
            "event_settings.html",
            {
                "event_settings": EVENT_SETTINGS,
                "caregiver_settings": caregiver_settings,
                "name_corrections": NAME_CORRECTIONS,
            },
        )
    return JsonResponse({"error": "Method not allowed"}, status=405)


@login_required
@require_http_methods(["POST"])
def flush_events(request, document_id):
    """Delete events from Google Calendar for a specific month."""
    try:
        # Get calendar_id from request
        calendar_id = request.POST.get('calendar_id')
        if not calendar_id:
            return JsonResponse({'error': _('Calendar ID is required')}, status=400)

        # Get appointments from session
        appointments = request.session.get('appointments', [])
        if not appointments:
            return JsonResponse({'error': _('No appointments found in session')}, status=400)

        # Parse if stored as JSON string
        if isinstance(appointments, str):
            try:
                appointments = json.loads(appointments)
            except Exception as e:
                logger.error(f"Error parsing appointments from session: {str(e)}")
                return JsonResponse({"error": _("Invalid session data")}, status=400)

        # Get month and year from the first appointment
        first_appointment = appointments[0]
        target_month = first_appointment.get('month')
        target_year = first_appointment.get('year')

        if not target_month or not target_year:
            return JsonResponse({'error': 'Invalid appointment data - missing month or year'}, status=400)

        # Get and decrypt the credentials from the user model
        try:
            encrypted_creds = request.user.p2c_profile.google_credentials
        except (AttributeError, P2CUserProfile.DoesNotExist):
            encrypted_creds = None
            
        if not encrypted_creds:
            return JsonResponse({'error': 'Google credentials not found'}, status=401)

        try:
            decrypted_creds_json = decrypt_credentials(encrypted_creds)
            credentials = json.loads(decrypted_creds_json)
        except Exception:
            return JsonResponse(
                {'error': 'Invalid or corrupted Google credentials. Please re-authenticate.'},
                status=401
            )

        # Use the secure Redis connection instead of direct instantiation
        # In development, skip the lock if Redis is unavailable
        try:
            from p2c.redis_connection import get_redis_connection
            redis_client = get_redis_connection()

            # Check if there's already a task running for this calendar/month
            lock_id = f"delete_events_{calendar_id}_{target_month}_{target_year}"
            lock = redis_client.lock(lock_id, timeout=300)  # 5 minute timeout

            if not lock.acquire(blocking=False):
                return JsonResponse({
                    'error': 'A task is already running for this calendar and month'
                }, status=409)  # HTTP 409 Conflict
            lock.release()  # Release immediately, the task will acquire it again
        except Exception as redis_error:
            # Log the error but continue in development mode
            logger.warning(f"Redis lock unavailable (continuing anyway): {str(redis_error)}")

        # Start the Celery task
        task = delete_events_task.delay(
            calendar_id=calendar_id,
            credentials=credentials,
            target_month=target_month,
            target_year=target_year
        )

        # Mark document as processed if it's a real PDF document
        if document_id and document_id != 0:
            try:
                document = Document.objects.get(id=document_id, user=request.user)
                document.processed = True
                document.status = Document.Status.COMPLETED
                document.save()
            except Document.DoesNotExist:
                pass

        # Return the task_id in a format expected by the JavaScript
        return JsonResponse({
            'task_id': task.id,
            'status': 'started'
        })

    except Exception as e:
        logger.error(f"Error in flush_events: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@login_required
def event_settings_edit(request):
    """Edit an existing event setting."""
    if request.method == "POST":
        try:
            # Check if the request has JSON content
            if request.content_type == "application/json":
                data = json.loads(request.body)
            else:
                data = request.POST

            name = data.get("name")
            if not name:
                error_msg = "Setting name is required."
                if request.headers.get("Accept") == "application/json":
                    return JsonResponse({"error": error_msg}, status=400)
                messages.error(request, error_msg)
                return redirect("event_settings")

            # Check if setting exists
            if name not in EVENT_SETTINGS:
                error_msg = f"Setting with name {name} does not exist."
                if request.headers.get("Accept") == "application/json":
                    return JsonResponse({"error": error_msg}, status=400)
                messages.error(request, error_msg)
                return redirect("event_settings")

            # Update setting
            EVENT_SETTINGS[name] = {
                "colorId": data.get("colorId", EVENT_SETTINGS[name].get("colorId", "1")),
                "description": data.get("description", "").strip(),
                "location": data.get("location", "").strip(),
            }
            save_event_settings(EVENT_SETTINGS)

            success_msg = f"Setting {name} updated successfully."
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"message": success_msg})
            messages.success(request, success_msg)
            return redirect("event_settings")

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            error_msg = str(e)
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"error": error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect("event_settings")

    return JsonResponse({"error": "Method not allowed"}, status=405)


@staff_member_required
@login_required
def event_settings_delete(request):
    """Delete an existing event setting."""
    if request.method == "POST":
        try:
            # Check if the request has JSON content
            if request.content_type == "application/json":
                data = json.loads(request.body)
            else:
                data = request.POST

            name = data.get("name")
            if not name:
                error_msg = "Setting name is required."
                if request.headers.get("Accept") == "application/json":
                    return JsonResponse({"error": error_msg}, status=400)
                messages.error(request, error_msg)
                return redirect("event_settings")

            # Check if setting exists
            if name not in EVENT_SETTINGS:
                error_msg = f"Setting with name {name} does not exist."
                if request.headers.get("Accept") == "application/json":
                    return JsonResponse({"error": error_msg}, status=400)
                messages.error(request, error_msg)
                return redirect("event_settings")

            # Don't allow deleting the DEFAULT setting
            if name == "DEFAULT":
                error_msg = "Cannot delete the DEFAULT setting."
                if request.headers.get("Accept") == "application/json":
                    return JsonResponse({"error": error_msg}, status=400)
                messages.error(request, error_msg)
                return redirect("event_settings")

            # Delete the setting
            del EVENT_SETTINGS[name]
            save_event_settings(EVENT_SETTINGS)

            success_msg = f"Setting {name} deleted successfully."
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"message": success_msg})
            messages.success(request, success_msg)
            return redirect("event_settings")

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            error_msg = str(e)
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"error": error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect("event_settings")

    return JsonResponse({"error": "Method not allowed"}, status=405)


@login_required
def get_latest_event_settings(request, document_id):
    """Get latest event settings for a document."""
    try:
        # Get appointments from session
        appointments = request.session.get('appointments', [])
        if not appointments:
            return JsonResponse({'error': 'No appointments found in session'}, status=400)

        # Get settings for each unique beneficiary
        event_settings = load_event_settings()
        settings_by_beneficiary = {}

        for appointment in appointments:
            name = appointment.get('normalized_name', '')
            if name and name not in settings_by_beneficiary:
                settings = event_settings.get(name, event_settings['DEFAULT'])
                settings_by_beneficiary[name] = {
                    'colorId': settings.get('colorId', '1'),
                    'description': settings.get('description', ''),
                    'location': settings.get('location', '')
                }

        return JsonResponse({
            'settings': settings_by_beneficiary
        })

    except Exception as e:
        logger.error(f"Error getting latest event settings: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@login_required
def event_settings_add(request):
    """Add a new event setting."""
    if request.method == "POST":
        try:
            # Check if the request has JSON content
            if request.content_type == "application/json":
                data = json.loads(request.body)
            else:
                data = request.POST

            name = data.get("name")
            if not name:
                error_msg = "Setting name is required."
                if request.headers.get("Accept") == "application/json":
                    return JsonResponse({"error": error_msg}, status=400)
                messages.error(request, error_msg)
                return redirect("event_settings")

            # Check if setting with this name already exists
            if name in EVENT_SETTINGS:
                error_msg = f"Setting with name {name} already exists."
                if request.headers.get("Accept") == "application/json":
                    return JsonResponse({"error": error_msg}, status=400)
                messages.error(request, error_msg)
                return redirect("event_settings")

            # Store settings with original case but match on uppercase
            name = data.get("name").strip()
            new_setting = {
                "colorId": data.get("colorId", "1"),  # Default to blue
                "description": data.get("description", "").strip(),
                "location": data.get("location", "").strip(),
            }

            # Store with original case
            EVENT_SETTINGS[name] = new_setting
            save_event_settings(EVENT_SETTINGS)

            success_msg = f"Setting {name} added successfully."
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"message": success_msg})
            messages.success(request, success_msg)
            return redirect("event_settings")
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data"}, status=400)


@staff_member_required
@login_required
@require_http_methods(["POST"])
def caregiver_rename_add(request):
    """Add a global caregiver rename."""
    from .config.caregiver_settings import add_caregiver_rename

    try:
        if request.content_type == "application/json":
            data = json.loads(request.body)
        else:
            data = request.POST

        original_name = data.get("original_name", "").strip()
        new_name = data.get("new_name", "").strip()

        if not original_name or not new_name:
            error_msg = "Both original name and new name are required."
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"error": error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect("event_settings")

        add_caregiver_rename(original_name, new_name)

        success_msg = f"Rename added: '{original_name}' → '{new_name}'"
        if request.headers.get("Accept") == "application/json":
            return JsonResponse({"message": success_msg})
        messages.success(request, success_msg)
        return redirect("event_settings")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)


@staff_member_required
@login_required
@require_http_methods(["POST"])
def caregiver_rename_delete(request):
    """Delete a global caregiver rename."""
    from .config.caregiver_settings import remove_caregiver_rename

    try:
        if request.content_type == "application/json":
            data = json.loads(request.body)
        else:
            data = request.POST

        original_name = data.get("original_name", "").strip()

        if not original_name:
            error_msg = "Original name is required."
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"error": error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect("event_settings")

        remove_caregiver_rename(original_name)

        success_msg = f"Rename for '{original_name}' removed."
        if request.headers.get("Accept") == "application/json":
            return JsonResponse({"message": success_msg})
        messages.success(request, success_msg)
        return redirect("event_settings")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)


@staff_member_required
@login_required
@require_http_methods(["POST"])
def caregiver_setting_edit(request):
    """Add or update a caregiver setting."""
    from .config.caregiver_settings import (
        load_caregiver_settings,
        save_caregiver_settings,
    )

    try:
        if request.content_type == "application/json":
            data = json.loads(request.body)
        else:
            data = request.POST

        caregiver_name = data.get("caregiver_name", "").strip()
        if not caregiver_name:
            error_msg = "Caregiver name is required."
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"error": error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect("event_settings")

        settings = load_caregiver_settings()
        setting = settings.get(caregiver_name, {})

        setting["colorId"] = data.get("color_id", setting.get("colorId", "1"))
        setting["Location"] = data.get("Location", setting.get("Location", ""))
        setting["Tél"] = data.get("Tél", setting.get("Tél", ""))
        setting["Description"] = data.get("Description", setting.get("Description", ""))
        setting["diminutive"] = data.get("diminutive", setting.get("diminutive", ""))

        settings[caregiver_name] = setting
        save_caregiver_settings(settings)

        success_msg = f"Setting for '{caregiver_name}' updated."
        if request.headers.get("Accept") == "application/json":
            return JsonResponse({"message": success_msg})
        messages.success(request, success_msg)
        return redirect("event_settings")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)


@staff_member_required
@login_required
@require_http_methods(["POST"])
def caregiver_setting_delete(request):
    """Delete a caregiver setting."""
    from .config.caregiver_settings import (
        load_caregiver_settings,
        save_caregiver_settings,
    )

    try:
        if request.content_type == "application/json":
            data = json.loads(request.body)
        else:
            data = request.POST

        caregiver_name = data.get("caregiver_name", "").strip()

        if not caregiver_name:
            error_msg = "Caregiver name is required."
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"error": error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect("event_settings")

        settings = load_caregiver_settings()
        if caregiver_name in settings:
            del settings[caregiver_name]
            save_caregiver_settings(settings)
            success_msg = f"Setting for '{caregiver_name}' removed."
        else:
            success_msg = f"No setting found for '{caregiver_name}'."

        if request.headers.get("Accept") == "application/json":
            return JsonResponse({"message": success_msg})
        messages.success(request, success_msg)
        return redirect("event_settings")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)


@login_required
def get_caregiver_settings_json(request):
    """Return caregiver settings as JSON."""
    from .config.caregiver_settings import load_caregiver_settings
    caregiver_settings = load_caregiver_settings()
    return JsonResponse(caregiver_settings)

@login_required
def save_selected_calendar(request):
    """Save the selected calendar ID for the user."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

    try:
        data = json.loads(request.body)
        calendar_id = data.get('calendar_id')
        if not calendar_id:
            return JsonResponse({'error': 'Calendar ID is required'}, status=400)

        profile, _ = P2CUserProfile.objects.get_or_create(user=request.user)
        profile.last_calendar_id = calendar_id
        profile.save()
        return JsonResponse({'status': 'success'})
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def pay_view(request):
    """Calculate pay including Sunday hours at higher rate."""
    appointments = request.session.get('appointments', [])
    
    # If stored as JSON string, parse it
    if isinstance(appointments, str):
        try:
            appointments = json.loads(appointments)
        except Exception:
            appointments = []

    # If no appointments in session, try to load from latest unprocessed document
    if not appointments:
        documents = Document.objects.filter(user=request.user, processed=False)
        if documents:
            try:
                latest_document = documents.latest("uploaded_at")
                if latest_document.file and os.path.exists(latest_document.file.path):
                    parser = PDFParserFactory.create_parser(latest_document.file.path)
                    appointments = parser.extract_schedule_entries(latest_document.file.path)
                    
                    if isinstance(parser, SchedulePDFParser):
                        formatted_appointments = []
                        for apt in appointments:
                            formatted_appointments.append({
                                "description": apt["beneficiary"],
                                "day": apt["start_time"].day,
                                "start_time": apt["start_time"].strftime("%H:%M"),
                                "end_time": apt["end_time"].strftime("%H:%M"),
                                "duration_minutes": apt["duration_minutes"],
                                "month": apt["start_time"].month,
                                "year": apt["start_time"].year,
                            })
                        appointments = formatted_appointments
                    else:
                        # Auxiliadom parser
                        appointments = [
                            apt for apt in appointments
                            if apt["description"].strip() != "Temps de pause repas"
                        ]
                        # Ensure year and month are present for metadata derivation below
                        for apt in appointments:
                            if 'month' not in apt: apt['month'] = parser._current_month
                            if 'year' not in apt: apt['year'] = parser._current_year
            except Exception as e:
                logger.error(f"Error loading appointments in pay_view: {str(e)}")

    # Load rates from configuration
    rates = load_rate_config()

    weekday_hours = 0
    sunday_hours = 0

    # Enhanced appointments with day of week info
    enhanced_appointments = []

    current_month = request.session.get('current_month')
    current_month_name = get_localized_month_name(current_month) if current_month else ''
    current_year = request.session.get('current_year', '')

    if appointments and (not current_month_name or not current_year):
        first = appointments[0]
        m = first.get('month')
        y = first.get('year')
        if m and not current_month_name:
            current_month_name = get_localized_month_name(m)
        if y and not current_year:
            current_year = y

    for appointment in appointments:
        # Skip breaks/pauses
        description = appointment.get('description', '').lower()
        if ('temps de pause repas' in description or
            'pause' in description or
            'repas' in description):
            continue

        # Get appointment date components
        year = appointment.get('year')
        month = appointment.get('month')
        day = appointment.get('day')

        if not all([year, month, day]):
            continue

        try:
            # Create datetime object for the appointment
            date = datetime(year=year, month=month, day=day)

            # Calculate duration in hours
            start_time = appointment.get('start_time', '').split(':')
            end_time = appointment.get('end_time', '').split(':')

            start_hour = int(start_time[0])
            start_min = int(start_time[1])
            end_hour = int(end_time[0])
            end_min = int(end_time[1])

            # Calculate duration in hours
            duration = (end_hour - start_hour) + (end_min - start_min) / 60
            if duration < 0:  # Handle overnight shifts
                duration += 24

            # Add day of week to appointment (0=Monday, 6=Sunday)
            enhanced_appointment = appointment.copy()
            enhanced_appointment['day_of_week'] = date.weekday()
            enhanced_appointment['is_sunday'] = date.weekday() == 6  # Only Sunday
            enhanced_appointments.append(enhanced_appointment)

            # Add hours to appropriate category
            if date.weekday() == 6:  # 6 = Sunday only
                sunday_hours += duration
            else:
                weekday_hours += duration

        except (ValueError, AttributeError, IndexError):
            continue

    context = {
        'appointments': enhanced_appointments,
        'current_month_name': current_month_name,
        'current_year': current_year,
        'weekday_rate': f"{rates['weekday_rate']:.2f}",
        'sunday_rate': f"{rates['sunday_rate']:.2f}",
        'weekday_hours': round(weekday_hours, 2),
        'sunday_hours': round(sunday_hours, 2),
        'total_hours': round(weekday_hours + sunday_hours, 2)
    }
    return render(request, 'pay_view.html', context)

@login_required
@require_http_methods(["POST"])
def update_rates(request):
    """Update payment rates in the configuration file."""
    try:
        data = json.loads(request.body)
        weekday_rate = float(data.get('weekday_rate', 25.00))
        sunday_rate = float(data.get('sunday_rate', 35.00))

        # Validate rates
        if weekday_rate < 0 or sunday_rate < 0:
            return JsonResponse({'error': 'Rates must be positive'}, status=400)

        # Save rates to configuration
        rates = {
            'weekday_rate': weekday_rate,
            'sunday_rate': sunday_rate
        }
        save_rate_config(rates)

        return JsonResponse({'status': 'success', 'rates': rates})
    except (json.JSONDecodeError, ValueError) as e:
        return JsonResponse({'error': 'Invalid data provided'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def updates_view(request):
    snapshots = PlanningSnapshot.objects.filter(user=request.user).order_by('-created_at')
    if snapshots.count() < 2:
        return render(request, 'updates.html', {'not_enough_snapshots': True})

    # for now, just diff the latest two
    # TODO: add pagination/selection of snapshots to diff
    latest_snapshot = snapshots[0]
    previous_snapshot = snapshots[1]

    diff_result = diff_snapshots(previous_snapshot.data, latest_snapshot.data)

    context = {
        'diff': diff_result,
        'latest_snapshot': latest_snapshot,
        'previous_snapshot': previous_snapshot,
    }
    return render(request, 'updates.html', context)

@login_required
def mark_snapshots_as_read(request):
    if request.method == 'POST':
        PlanningSnapshot.objects.filter(user=request.user, read=False).update(read=True)
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)

@login_required
def json_ingest_view(request):
    return render(request, 'json_ingest.html')

@login_required
def calendar_editor_view(request):
    return render(request, 'calendar_editor.html')

@login_required
def backup_history_view(request):
    """Display list of calendar backups for the user."""
    backups = CalendarBackup.objects.filter(user=request.user).order_by('-backup_date')

    # Group backups by calendar
    backups_by_calendar = {}
    for backup in backups:
        if backup.calendar_name not in backups_by_calendar:
            backups_by_calendar[backup.calendar_name] = []
        backups_by_calendar[backup.calendar_name].append(backup)

    context = {
        'backups': backups,
        'backups_by_calendar': backups_by_calendar,
        'total_backups': backups.count(),
    }
    return render(request, 'backup_history.html', context)


@login_required
def backup_preview_json(request, backup_id):
    """Return JSON preview of backup data."""
    try:
        backup = CalendarBackup.objects.get(id=backup_id, user=request.user)
        return JsonResponse({
            'calendar_name': backup.calendar_name,
            'calendar_id': backup.calendar_id,
            'month': backup.month,
            'year': backup.year,
            'backup_date': backup.backup_date.strftime('%Y-%m-%d %H:%M:%S'),
            'event_count': backup.event_count,
            'events': backup.events_json
        })
    except CalendarBackup.DoesNotExist:
        return JsonResponse({'error': 'Backup not found'}, status=404)
    except Exception as e:
        logger.error(f"Error previewing backup {backup_id}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def backup_download(request, backup_id):
    """Download backup as JSON file."""
    from django.http import HttpResponse

    try:
        backup = CalendarBackup.objects.get(id=backup_id, user=request.user)

        # Create JSON response
        backup_data = {
            'backup_metadata': {
                'calendar_name': backup.calendar_name,
                'calendar_id': backup.calendar_id,
                'month': backup.month,
                'year': backup.year,
                'backup_date': backup.backup_date.isoformat(),
                'event_count': backup.event_count
            },
            'events': backup.events_json
        }

        response = HttpResponse(
            json.dumps(backup_data, indent=2),
            content_type='application/json'
        )
        filename = f"backup_{backup.calendar_name}_{backup.year}{backup.month:02d}_{backup.backup_date.strftime('%Y%m%d_%H%M%S')}.json"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except CalendarBackup.DoesNotExist:
        return JsonResponse({'error': 'Backup not found'}, status=404)
    except Exception as e:
        logger.error(f"Error downloading backup {backup_id}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def backup_restore(request, backup_id):
    """Launch async restore task for backup events to Google Calendar.

    Supports selective restore by passing event_indices in request body.
    Returns task_id for progress tracking.
    """
    try:
        # Verify backup exists and belongs to user
        backup = CalendarBackup.objects.get(id=backup_id, user=request.user)

        # Parse request body for selective restore
        event_indices = None
        if request.body:
            try:
                body_data = json.loads(request.body)
                event_indices = body_data.get('event_indices')
            except json.JSONDecodeError:
                pass

        # Get and decrypt user's Google credentials
        try:
            encrypted_creds = request.user.p2c_profile.google_credentials
        except (AttributeError, P2CUserProfile.DoesNotExist):
            encrypted_creds = None
            
        if not encrypted_creds:
            return JsonResponse(
                {'error': 'Google credentials not found. Please log in with Google first.'},
                status=401
            )
        try:
            decrypted_creds_json = decrypt_credentials(encrypted_creds)
            credentials = json.loads(decrypted_creds_json)
        except Exception:
            return JsonResponse(
                {'error': 'Invalid or corrupted Google credentials. Please re-authenticate.'},
                status=401
            )

        # Launch async restore task
        task = restore_backup_task.delay(
            backup_id=backup_id,
            user_id=request.user.id,
            credentials=credentials,
            event_indices=event_indices
        )

        return JsonResponse({
            'success': True,
            'task_id': task.id,
            'message': 'Restore task started. Use task_id to track progress.'
        })

    except CalendarBackup.DoesNotExist:
        return JsonResponse({'error': 'Backup not found'}, status=404)
    except Exception as e:
        logger.error(f"Error launching restore task for backup {backup_id}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def backup_delete(request, backup_id):
    """Delete a backup."""
    from .backup_utils import delete_backup_file

    try:
        backup = CalendarBackup.objects.get(id=backup_id, user=request.user)

        # Delete the JSON file if it exists
        if backup.json_file_path:
            try:
                delete_backup_file(backup.json_file_path)
            except Exception as file_error:
                logger.warning(f"Error deleting backup file {backup.json_file_path}: {str(file_error)}")

        # Delete the database record
        backup.delete()

        return JsonResponse({'success': True})

    except CalendarBackup.DoesNotExist:
        return JsonResponse({'error': 'Backup not found'}, status=404)
    except Exception as e:
        logger.error(f"Error deleting backup {backup_id}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


def privacy_policy(request):
    """Display the privacy policy."""
    return render(request, "privacy.html")


def terms_of_service(request):
    """Display the terms of service."""
    return render(request, "terms.html")