from django.urls import path, include

app_name = "emoty"

urlpatterns = [
    path('api/', include('emoty.api_urls')),
]
