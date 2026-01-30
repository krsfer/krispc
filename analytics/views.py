from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.db import models
from django.db.models import Count, Avg, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from django.db.models import Q
import json
from .models import PageVisit, ErrorEvent, UserInteraction

@staff_member_required
def analytics_dashboard(request):
    from .services import get_analytics_dashboard_data
    
    data = get_analytics_dashboard_data(days_back=30)
    
    # Prepare context for template (JSON serialization for JS variables)
    context = {
        'summary': data['summary'],
        'charts': {
            'dates': json.dumps(data['charts']['dates']),
            'daily_counts': json.dumps(data['charts']['daily_counts']),
            'device_labels': json.dumps(data['charts']['device_labels']),
            'device_data': json.dumps(data['charts']['device_data']),
            'browser_labels': json.dumps(data['charts']['browser_labels']),
            'browser_data': json.dumps(data['charts']['browser_data']),
            'country_labels': json.dumps(data['charts']['country_labels']),
            'country_data': json.dumps(data['charts']['country_data']),
        },
        'top_pages': data['top_pages'],
        'country_stats': data['country_stats'],
        'unique_ip_locations': data['unique_ip_locations'],
        'map_data': json.dumps(data['map_data']),
        'mapbox_token': data['mapbox_token'],
        'cwv': data['cwv'],
        'title': 'Analytics Dashboard'
    }
    
    return render(request, 'analytics/dashboard.html', context)