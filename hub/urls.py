from django.urls import path
from . import views

app_name = 'hub'

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('switch-lang/', views.switch_language, name='switch_language'),
    path('privacy/', views.PrivacyView.as_view(), name='privacy'),
    path('terms/', views.TermsView.as_view(), name='terms'),
]
