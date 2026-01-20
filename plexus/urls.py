from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from .views import (
    IngestAPIView, IndexView, CaptureView, DashboardView, 
    ReviewQueueListView, ReviewResolveView,
    ActionListView, KanbanView, ActionToggleView, ThoughtUpdateView, ThoughtDeleteView,
    AdminDashboardView, VoiceCaptureView, ThoughtRetryView
)
from .api_views import InputViewSet, ThoughtViewSet, ActionViewSet, SyncView

app_name = "plexus"

# API Router
router = DefaultRouter()
router.register(r"inputs", InputViewSet)
router.register(r"thoughts", ThoughtViewSet)
router.register(r"actions", ActionViewSet)

urlpatterns = [
    # Web Views
    path("", IndexView.as_view(), name="index"),
    path("capture/", CaptureView.as_view(), name="capture"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("dashboard/admin/", AdminDashboardView.as_view(), name="admin_dashboard"),
    path("thought/<int:pk>/edit/", ThoughtUpdateView.as_view(), name="thought_edit"),
    path("thought/<int:pk>/delete/", ThoughtDeleteView.as_view(), name="thought_delete"),
    path("thought/<int:pk>/retry/", ThoughtRetryView.as_view(), name="thought_retry"),
    path("review-queue/", ReviewQueueListView.as_view(), name="review_queue"),
    path("review-queue/<int:pk>/resolve/", ReviewResolveView.as_view(), name="review_resolve"),
    path("action-center/", ActionListView.as_view(), name="action_center"),
    path("action-kanban/", KanbanView.as_view(), name="action_kanban"),
    path("action/<int:pk>/toggle/", ActionToggleView.as_view(), name="action_toggle"),
    
    # Specific API Endpoints (Legacy/Specific)
    path("api/v1/ingest/", IngestAPIView.as_view(), name="ingest"),
    path("api/v1/capture/voice/", VoiceCaptureView.as_view(), name="voice_capture"),
    path("api/v1/sync/", SyncView.as_view(), name="sync"),

    # REST API via Router
    path("api/v1/", include(router.urls)),

    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="plexus:schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="plexus:schema"), name="redoc"),
]
