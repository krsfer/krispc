"""URL configuration for the P2C (PDF to Calendar) application."""
from asgiref.sync import async_to_sync, sync_to_async
from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from . import celery_views, json_views, views

app_name = "p2c"

router = DefaultRouter()
router.register(r"documents", views.DocumentViewSet)

urlpatterns = [
    path("", views.home, name="home"),
    path("google-login/", views.google_login, name="google_login"),
    path("login/google/", views.google_login, name="google_login"),
    path("upload-pdf/", views.upload_pdf, name="upload_pdf"),
    path("process-text/", views.process_text, name="process_pasted_text"),
    path(
        "create-events/<int:document_id>/",
        csrf_exempt(views.create_events),
        name="create_events",
    ),
    path(
        "flush-events/<int:document_id>/",
        csrf_exempt(views.flush_events),
        name="flush_events",
    ),
    path("create-calendar/", views.create_calendar, name="create_calendar"),
    path("get-calendars/", views.get_calendars, name="get_calendars"),
    path("privacy/", views.privacy_policy, name="privacy_policy"),
    path("terms/", views.terms_of_service, name="terms_of_service"),
    path("api/", include(router.urls)),
    # Event Settings URLs
    path("event-settings/", views.event_settings_view, name="event_settings"),
    path("event-settings/add/", views.event_settings_add, name="event_settings_add"),
    path("event-settings/edit/", views.event_settings_edit, name="event_settings_edit"),
    path(
        "event-settings/delete/",
        views.event_settings_delete,
        name="event_settings_delete",
    ),
    path(
        "event-settings/get-latest/<int:document_id>/",
        views.get_latest_event_settings,
        name="get_latest_event_settings",
    ),
    path(
        "get-caregiver-settings-json/",
        views.get_caregiver_settings_json,
        name="get_caregiver_settings_json",
    ),
    # Caregiver Rename URLs
    path(
        "caregiver-rename/add/", views.caregiver_rename_add, name="caregiver_rename_add"
    ),
    path(
        "caregiver-rename/delete/",
        views.caregiver_rename_delete,
        name="caregiver_rename_delete",
    ),
    # Caregiver Settings URLs
    path(
        "caregiver-setting/edit/",
        views.caregiver_setting_edit,
        name="caregiver_setting_edit",
    ),
    path(
        "caregiver-setting/delete/",
        views.caregiver_setting_delete,
        name="caregiver_setting_delete",
    ),
    path(
        "celery-progress/",
        include(
            [
                path(
                    "task_status/<str:task_id>/",
                    celery_views.ProgressView.as_view(),
                    name="task_status",
                ),
            ]
        ),
    ),
    path(
        "save-selected-calendar/",
        views.save_selected_calendar,
        name="save_selected_calendar",
    ),
    path("pay/", views.pay_view, name="pay_view"),
    path("update-rates/", views.update_rates, name="update_rates"),
    # Updates diff page and month view
    path("updates/", views.updates_view, name="updates"),
    # path("updates/month/", views.updates_month_view, name="updates_month"),
    path("json-ingest/", views.json_ingest_view, name="json_ingest"),
    path(
        "process-json-events/",
        json_views.process_json_events,
        name="process_json_events",
    ),
    path(
        "process-pdf-for-display/",
        json_views.process_pdf_for_display,
        name="process_pdf_for_display",
    ),
    path(
        "sync-pdf-to-calendar/",
        json_views.sync_pdf_to_calendar,
        name="sync_pdf_to_calendar",
    ),
    path(
        "get-caregiver-settings/",
        json_views.get_caregiver_settings,
        name="get_caregiver_settings",
    ),
    # Calendar Editor
    path("calendar-editor/", views.calendar_editor_view, name="calendar_editor"),
    path(
        "calendar-editor/fetch-events/",
        json_views.calendar_editor_fetch_events,
        name="calendar_editor_fetch_events",
    ),
    path(
        "calendar-editor/fetch-latest-snapshot/",
        json_views.calendar_editor_fetch_latest_snapshot,
        name="calendar_editor_fetch_latest_snapshot",
    ),
    path(
        "calendar-editor/submit-changes/",
        json_views.calendar_editor_submit_changes,
        name="calendar_editor_submit_changes",
    ),
    # Temporary tool for debugging PDFs
    # path("pdf-to-text/", views.pdf_to_text_view, name="pdf_to_text"),
    path("mark-snapshots-as-read/", views.mark_snapshots_as_read, name="mark_snapshots_as_read"),
    # Calendar Backup URLs
    path("backup-history/", views.backup_history_view, name="backup_history"),
    path("backup/preview/<int:backup_id>/", views.backup_preview_json, name="backup_preview"),
    path("backup/download/<int:backup_id>/", views.backup_download, name="backup_download"),
    path("backup/restore/<int:backup_id>/", views.backup_restore, name="backup_restore"),
    path("backup/delete/<int:backup_id>/", views.backup_delete, name="backup_delete"),
    
    # API Documentation (OpenAPI/Swagger/ReDoc)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="p2c:schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="p2c:schema"), name="redoc"),
]
