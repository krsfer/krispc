from django.urls import path, include

app_name = "emoty"

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from . import views

app_patterns = [
    path('', views.DeveloperIndexView.as_view(), name='developer-index'),
    path('api/', include('emoty.api_urls')),
]

urlpatterns = app_patterns + [
    # Schema
    path("api/schema/", SpectacularAPIView.as_view(patterns=app_patterns), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="emoty:schema"), name="swagger-ui"),
]
