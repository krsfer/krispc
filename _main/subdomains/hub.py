from django.urls import include, path
from django.conf.urls.i18n import i18n_patterns

# Hub Subdomain (hub.krispc.fr)
urlpatterns = i18n_patterns(
    path('', include('hub.urls')),
    prefix_default_language=False
)
