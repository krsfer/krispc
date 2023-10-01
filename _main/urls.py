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
# from django.contrib import admin
from django.urls import include, path

import addthem.views
import hello.views
from krispc import views

urlpatterns = i18n_patterns(
    path("", include("krispc.urls")),
    #
    path("start/", hello.views.index, name="index"),
    path("db/", hello.views.db, name="db"),
    path("addthem/", addthem.views.index, name="addthem"),
    path('chat/', include('chat.urls')),
    #
    path("favicon.ico", views.favicon),
    #
    path("i18n/", include("django.conf.urls.i18n")),
    #
    prefix_default_language=False,
)


# Uncomment this and the entry in `INSTALLED_APPS` if you wish to use the Django admin feature:
# https://docs.djangoproject.com/en/4.2/ref/contrib/admin/
# path("admin/", admin.site.urls),
