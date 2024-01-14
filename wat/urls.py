from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('mapbox_token/', views.mapbox_token, name='mapbox_token'),
    path('contacts_json/', views.contacts_json, name='contacts_json'),

]
