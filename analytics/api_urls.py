from django.urls import path
from . import api_views

urlpatterns = [
    path('dashboard/', api_views.DashboardDataView.as_view(), name='dashboard_data'),
    path('track/init/', api_views.TrackVisitView.as_view(), name='track_init'),
    path('track/update/<int:visit_id>/', api_views.UpdateVisitView.as_view(), name='track_update'),
    path('track/interaction/<int:visit_id>/', api_views.TrackInteractionView.as_view(), name='track_interaction'),
    path('track/error/', api_views.TrackErrorView.as_view(), name='track_error'),
]
