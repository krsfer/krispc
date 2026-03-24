from django.urls import path

from . import views

urlpatterns = [
    path("streams/", views.stream_list, name="stream-list"),
    path("streams/<str:name>/", views.stream_detail, name="stream-detail"),
    path("recordings/", views.recording_list, name="recording-list"),
    path("recordings/delete/", views.recording_delete, name="recording-delete"),
    path("sessions/<str:session_id>/kick/", views.kick_session, name="session-kick"),
]
