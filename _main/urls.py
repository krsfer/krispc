"""
URL configuration for _main project.
"""
from django.conf import settings
from django.conf.urls.i18n import i18n_patterns
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.contrib.auth import views as auth_views
from django.views.static import serve

import krispc.views
import p2c.views
import hub.views

def health_check(request):
    """Health check endpoint for fly.io"""
    return JsonResponse({"status": "healthy"}, status=200)

urlpatterns = [
    path('health', health_check, name='health'),
    # Legacy Google OAuth callback path to match existing console configuration
    path("login/google/", p2c.views.google_login, name="google_login_callback"),
    
    # Root URL (Non-i18n) to respect session language
    path("", hub.views.IndexView.as_view(), name="home"),
    
    # KrisPC API
    path("api/krispc/", include("krispc.api_urls")),
    
    # Documentation
    path("docs/mcp/", krispc.views.MCPDocsView.as_view(), name="mcp-docs"),

    # Serve media files in production
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]

urlpatterns += i18n_patterns(
    # Root URL serves the hub landing page
    path("", include("hub.urls")),
    
    path("krispc/", include("krispc.urls")),
    path("start/", krispc.views.IndexPageView.as_view(), name="krispc_index"), # Fallback
    
    path('plexus/', include('plexus.urls')),
    path("login/", auth_views.LoginView.as_view(template_name="plexus/registration/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    
    # PDF2Cal app
    path("importpdf/", include("p2c.urls")),
    path("celery-progress/", include("celery_progress.urls")),

    path("favicon.ico", krispc.views.favicon),
    
    path("i18n/", include("django.conf.urls.i18n")),
    path("admin/", admin.site.urls),
    prefix_default_language=False,
)

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
