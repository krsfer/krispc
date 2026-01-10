from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from . import api

router = DefaultRouter()
router.register(r'contacts', api.ContactViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('products/', api.ProductsView.as_view(), name='api-products'),
    path('colophon/', api.ColophonView.as_view(), name='api-colophon'),
    path('marques/', api.MarquesView.as_view(), name='api-marques'),
    path('villes/', api.VillesView.as_view(), name='api-villes'),
    # Schema
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]