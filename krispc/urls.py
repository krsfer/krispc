from django.urls import path

from krispc.views import IndexKPageView

urlpatterns = [
    # path('change_language/', change_language, name='change_language'),
    # path("", IndexPageView.as_view(), name="index"),
    path("", IndexKPageView.as_view(), name="_index"),
]
