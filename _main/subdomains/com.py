from django.urls import include, path
from django.conf.urls.i18n import i18n_patterns

# Commercial Subdomain (com.krispc.fr)
urlpatterns = i18n_patterns(
    path('', include('krispc.urls')),
    prefix_default_language=False
)
