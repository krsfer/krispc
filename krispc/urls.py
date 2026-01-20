"""URL configuration for the KrisPC application."""
from django.urls import path

from krispc.views import create_contact, favicon, IndexPageView, PrivacyView, TermsView

app_name = "krispc"

urlpatterns = [
    # path('change_language/', change_language, name='change_language'),
    path("", IndexPageView.as_view(), name="index"),
    path("privacy/", PrivacyView.as_view(), name="privacy"),
    path("terms/", TermsView.as_view(), name="terms"),
    path("create/", create_contact, name="create"),
    path("favicon.ico", favicon, name="favicon"),
]
