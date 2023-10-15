from django.urls import path

from krispc.views import create_contact, favicon, IndexPageView

urlpatterns = [
    # path('change_language/', change_language, name='change_language'),
    # path("", IndexPageView.as_view(), name="index"),
    path("", IndexPageView.as_view(), name="_index"),
    path("create/", create_contact, name="create_contact"),
    path("favicon.ico", favicon),
]
