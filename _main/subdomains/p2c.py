from django.urls import include, path
from django.conf.urls.i18n import i18n_patterns

# P2C Subdomain (p2c.krispc.fr)
urlpatterns = i18n_patterns(
    path('', include('p2c.urls')),
    prefix_default_language=False
)
