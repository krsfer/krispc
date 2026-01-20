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

def health_check(request):
    """Health check endpoint for fly.io"""
    return JsonResponse({"status": "healthy"}, status=200)

urlpatterns = [
    path('health', health_check, name='health'),
    
    # Serve media files in production (since we use local file storage on Fly.io)
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]

urlpatterns += i18n_patterns(
    path('plexus/', include('plexus.urls')),
    path("login/", auth_views.LoginView.as_view(template_name="plexus/registration/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    
    path("i18n/", include("django.conf.urls.i18n")),
    path("admin/", admin.site.urls),
    prefix_default_language=False,
)

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
