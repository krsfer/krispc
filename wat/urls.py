from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('mapbox_token/', views.mapbox_token, name='mapbox_token'),
    path('googlemaps_token/', views.googlemaps_token, name='googlemaps_token'),
    path('contacts_json/', views.contacts_json, name='contacts_json'),
    path('update_contacts_json', views.update_contacts_json, name='update_contacts_json'),

]
