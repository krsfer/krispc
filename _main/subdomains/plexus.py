from django.urls import include, path
from django.conf.urls.i18n import i18n_patterns

# Plexus Subdomain (plexus.krispc.fr)
urlpatterns = i18n_patterns(
    path('', include('plexus.urls')),
    prefix_default_language=False
)
