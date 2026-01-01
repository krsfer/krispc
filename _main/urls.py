"""
URL configuration for _main project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')$
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.contrib.auth import views as auth_views

import hello.views
import krispc.views
import wat.views
import p2c.views


def health_check(request):
    """Health check endpoint for fly.io"""
    return JsonResponse({"status": "healthy"}, status=200)


# Health check endpoint (outside i18n_patterns, no trailing slash to match fly.toml)
urlpatterns = [
    path('health', health_check, name='health'),
    # Legacy Google OAuth callback path to match existing console configuration
    path("login/google/", p2c.views.google_login, name="google_login_callback"),
]

urlpatterns += i18n_patterns(
    path("", include("krispc.urls")),
    path("wat/", include("wat.urls")),
    #
    path("start/", hello.views.index, name="index"),
    path("db/", hello.views.db, name="db"),
    path("addthem/", include('addthem.urls')),
    path('chat/', include('chat.urls')),
    path("logout/", auth_views.LogoutView.as_view(next_page="home"), name="logout"),
    
    # PDF2Cal app
    path("importpdf/", include("p2c.urls")),
    path("celery-progress/", include("celery_progress.urls")),

    # path("wat/", wat.views.index, name="wat"),
    #
    path("favicon.ico", krispc.views.favicon),
    #
    path("i18n/", include("django.conf.urls.i18n")),
    #
    path("admin/", admin.site.urls),
    prefix_default_language=False,
)