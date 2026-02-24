from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path


urlpatterns = [
    path("analytics/api/", include("analytics.api_urls")),
    path("api/krispc/", include("krispc.api_urls")),
]

urlpatterns += i18n_patterns(
    path("", include(("sas.urls", "sas"), namespace="sas")),
    path("hub/", include(("hub.urls", "hub"), namespace="hub")),
    path("krispc/", include(("krispc.urls", "krispc"), namespace="krispc")),
    path("p2c/", include(("p2c.urls", "p2c"), namespace="p2c")),
    path("plexus/", include(("plexus.urls", "plexus"), namespace="plexus")),
    path("emo/developers/", include(("emoty.urls", "emoty"), namespace="emoty")),
    path("login/", auth_views.LoginView.as_view(template_name="plexus/registration/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    path("admin/", admin.site.urls),
    prefix_default_language=False,
)
