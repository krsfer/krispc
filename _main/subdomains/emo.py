from django.urls import path, include, re_path
from django.conf.urls.i18n import i18n_patterns
from _main.proxy import proxy_to_emoty
from django.contrib.auth import views as auth_views
import krispc.views

# Emoty Subdomain (emo.krispc.fr)
urlpatterns = [
    path('api/', include(('emoty.api_urls', 'emoty_api'), namespace='emoty_api')),
    # Expose API endpoints at root for subdomain usage (e.g. /services/, /mcp/)
    path('', include(('emoty.api_urls', 'emoty_api'), namespace='emoty_api_root')),
]

urlpatterns += i18n_patterns(
    path('developers/', include(('emoty.urls', 'emoty'), namespace='emoty')),
    path('hub/', include(('hub.urls', 'hub'), namespace='hub')),
    path("login/", auth_views.LoginView.as_view(template_name="plexus/registration/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    path("docs/mcp/", krispc.views.MCPDocsView.as_view(), name="mcp-docs"),
    re_path(r"^(?P<path>.*)$", proxy_to_emoty),
    prefix_default_language=False
)
