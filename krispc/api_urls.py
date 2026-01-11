"""
URL Configuration for KrisPC API.

Provides versioned REST API endpoints with OpenAPI documentation.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import (
    SpectacularAPIView, 
    SpectacularRedocView, 
    SpectacularSwaggerView
)
from . import api

# Create router for viewsets
router = DefaultRouter()
router.register(r'contacts', api.ContactViewSet, basename='contact')

# API v1 endpoints
v1_patterns = [
    # ViewSet endpoints (with router)
    path('', include(router.urls)),
    
    # Simple API views
    path('services/', api.ServicesView.as_view(), name='api-services'),
    path('pricelist/', api.PricelistView.as_view(), name='api-pricelist'),
    path('colophon/', api.ColophonView.as_view(), name='api-colophon'),
    path('marques/', api.MarquesView.as_view(), name='api-marques'),
    path('villes/', api.VillesView.as_view(), name='api-villes'),
]

# Main URL patterns
urlpatterns = [
    # API endpoints
    path('', include(v1_patterns)),
    
    # Schema and Documentation
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]