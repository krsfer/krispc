from django.urls import path
from . import api_views
from . import views

urlpatterns = [
    path('dashboard/', views.analytics_dashboard, name='analytics_dashboard'),
    path('api/track/init/', api_views.TrackVisitView.as_view(), name='track_init'),
    path('api/track/update/<int:visit_id>/', api_views.UpdateVisitView.as_view(), name='track_update'),
    path('api/track/interaction/<int:visit_id>/', api_views.TrackInteractionView.as_view(), name='track_interaction'),
    path('api/track/error/', api_views.TrackErrorView.as_view(), name='track_error'),
]
