from django.urls import include, path
from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin
from django.contrib.auth import views as auth_views

# Commercial Subdomain (com.krispc.fr)
urlpatterns = i18n_patterns(
    # Local App (Root)
    path('', include('krispc.urls')),
    
    # Shadow Apps
    path('hub/', include('hub.urls')),
    path('p2c/', include('p2c.urls')),
    path('plexus/', include('plexus.urls')),
    
    # Shared
    path("login/", auth_views.LoginView.as_view(template_name="plexus/registration/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    path("admin/", admin.site.urls),

    prefix_default_language=False
)