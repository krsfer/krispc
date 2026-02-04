from django.urls import include, path
from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin
from django.contrib.auth import views as auth_views
import krispc.views

# P2C Subdomain (p2c.krispc.fr)

# Non-i18n Patterns (APIs)
urlpatterns = [
    path("analytics/api/", include("analytics.api_urls")),
    path("api/krispc/", include("krispc.api_urls")), # Also include global APIs if needed
]

urlpatterns += i18n_patterns(
    # Local App (Root)
    path('', include(('p2c.urls', 'p2c'), namespace='p2c')),
    
    # Shadow Apps
    path('hub/', include(('hub.urls', 'hub'), namespace='hub')),
    path('krispc/', include(('krispc.urls', 'krispc'), namespace='krispc')),
    path('plexus/', include(('plexus.urls', 'plexus'), namespace='plexus')),
    path("docs/mcp/", krispc.views.MCPDocsView.as_view(), name="mcp-docs"),
    
    # Shared
    path("login/", auth_views.LoginView.as_view(template_name="plexus/registration/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    path("admin/", admin.site.urls),

    prefix_default_language=False
)
