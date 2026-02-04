"""
URL Configuration for Emoty API.
"""
from django.urls import path
from drf_spectacular.views import (
    SpectacularAPIView, 
    SpectacularRedocView, 
    SpectacularSwaggerView
)
from . import api_views

app_name = "emoty_api"

# API endpoints
api_urlpatterns = [
    path('services/', api_views.ServicesView.as_view(), name='api-services'),
    path('pricelist/', api_views.PricelistView.as_view(), name='api-pricelist'),
    path('mcp/', api_views.MCPView.as_view(), name='api-mcp'),
    path('generate/', api_views.PatternGeneratorView.as_view(), name='api-generate'),
]

# Schema and Documentation
urlpatterns = api_urlpatterns + [
    path('schema/', SpectacularAPIView.as_view(patterns=api_urlpatterns), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='emoty_api:schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='emoty_api:schema'), name='redoc'),
]
