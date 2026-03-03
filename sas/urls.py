from django.urls import path

from sas import views

app_name = "sas"

urlpatterns = [
    path("", views.index, name="index"),
    path("upload/", views.upload, name="upload"),
    path("download/<uuid:share_uuid>/", views.download, name="download"),
]
