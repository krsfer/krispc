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
    # Time range (last 30 days)
    days_back = 30
    start_date = timezone.now() - timedelta(days=days_back)
    
    # Base QuerySet
    visits = PageVisit.objects.filter(timestamp__gte=start_date)
    
    # 1. Summary Cards
    total_visits = visits.count()
    
    # Calculate unique visitors (based on session_key)
    unique_visitors = visits.values('session_key').distinct().count()
    
    # Avg Time on Page (exclude 0s which might be bounces or instant leaves)
    avg_time = visits.filter(time_on_page__gt=0).aggregate(avg=Avg('time_on_page'))['avg'] or 0
    
    # Rage Clicks (Total)
    rage_clicks = UserInteraction.objects.filter(
        timestamp__gte=start_date, 
        interaction_type='rage_click'
    ).count()
    
    # Errors
    total_errors = ErrorEvent.objects.filter(timestamp__gte=start_date).count()

    # 2. Visits over time (Line Chart)
    daily_stats = visits.annotate(date=TruncDate('timestamp')) \
        .values('date') \
        .annotate(count=Count('id')) \
        .order_by('date')
    
    dates = [stat['date'].strftime('%Y-%m-%d') for stat in daily_stats]
    daily_counts = [stat['count'] for stat in daily_stats]

    # 3. Device Breakdown (Pie Chart)
    device_stats = visits.values('device_type') \
        .annotate(count=Count('id')) \
        .order_by('-count')
    
    device_labels = [stat['device_type'] or 'Unknown' for stat in device_stats]
    device_data = [stat['count'] for stat in device_stats]

    # 4. Browser Breakdown (Doughnut Chart)
    browser_stats = visits.values('browser') \
        .annotate(count=Count('id')) \
        .order_by('-count')[:5] # Top 5
    
    browser_labels = [stat['browser'] or 'Unknown' for stat in browser_stats]
    browser_data = [stat['count'] for stat in browser_stats]

    # 5. Top Pages (Bar Chart or Table)
    top_pages_qs = visits.values('path') \
        .annotate(count=Count('id'), avg_time=Avg('time_on_page')) \
        .order_by('-count')[:10]
    
    # Convert to list and round avg_time
    top_pages = []
    for page in top_pages_qs:
        page['avg_time'] = round(page['avg_time'], 1) if page['avg_time'] else 0
        top_pages.append(page)

    # 6. Top Countries
    country_stats = visits.values('country') \
        .exclude(country__isnull=True) \
        .annotate(count=Count('id')) \
        .order_by('-count')[:5]
        
    country_labels = [stat['country'] for stat in country_stats]
    country_data = [stat['count'] for stat in country_stats]
    
    # 7. Recent Unique Locations (Coordinate-based grouping)
    # Fetch stats for IPs with valid location data
    # We fetch more than 20 to allow for grouping reduction
    ip_stats = visits.exclude(latitude__isnull=True).values(
        'ip_address', 'latitude', 'longitude', 'city', 'country', 'region', 
        'postal_code', 'isp', 'organization', 'network_type', 'timezone'
    ).annotate(
        latest_timestamp=models.Max('timestamp'),
        count=Count('id')
    ).order_by('-latest_timestamp')[:100]

    grouped_locations = {}
    
    for entry in ip_stats:
        # Create a key based on coordinates (rounded slightly if needed, but exact per request)
        # Using exact float values from DB
        key = (entry['latitude'], entry['longitude'])
        
        if key not in grouped_locations:
            grouped_locations[key] = {
                'ips': set(),
                'data': entry, # Use the most recent entry for location details
                'total_visits': 0,
                'last_visit': entry['latest_timestamp']
            }
        
        group = grouped_locations[key]
        group['ips'].add(entry['ip_address'])
        group['total_visits'] += entry['count']
        
        # Ensure we have the latest timestamp across the group
        if entry['latest_timestamp'] > group['last_visit']:
             group['last_visit'] = entry['latest_timestamp']
             group['data'] = entry # Update metadata to latest
    
    # Convert to list
    sorted_locations = sorted(grouped_locations.values(), key=lambda x: x['last_visit'], reverse=True)[:20]
    
    unique_ip_locations = []
    map_data = []
    
    for loc in sorted_locations:
        data = loc['data']
        # Construct object-like dict for template
        location_obj = {
            'ip_address': " ".join(sorted(list(loc['ips']))), # Space-separated IPs
            'visit_count': loc['total_visits'],
            'city': data.get('city'),
            'region': data.get('region'),
            'country': data.get('country'),
            'postal_code': data.get('postal_code'),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'isp': data.get('isp'),
            'organization': data.get('organization'),
            'network_type': data.get('network_type'),
            'timezone': data.get('timezone'),
        }
        unique_ip_locations.append(location_obj)
        
        if data.get('latitude') and data.get('longitude'):
             map_data.append({
                 'lat': data['latitude'],
                 'lng': data['longitude'],
                 'city': data.get('city') or 'Unknown',
                 'count': loc['total_visits']
             })

    # 8. Core Web Vitals (Averages)
    cwv_stats = visits.aggregate(
        avg_ttfb=Avg('ttfb'),
        avg_lcp=Avg('lcp'),
        avg_cls=Avg('cls'),
        avg_inp=Avg('inp')
    )

    context = {
        'summary': {
            'total_visits': total_visits,
            'unique_visitors': unique_visitors,
            'avg_time': round(avg_time, 1),
            'rage_clicks': rage_clicks,
            'total_errors': total_errors,
        },
        'charts': {
            'dates': json.dumps(dates),
            'daily_counts': json.dumps(daily_counts),
            'device_labels': json.dumps(device_labels),
            'device_data': json.dumps(device_data),
            'browser_labels': json.dumps(browser_labels),
            'browser_data': json.dumps(browser_data),
            'country_labels': json.dumps(country_labels),
            'country_data': json.dumps(country_data),
        },
        'top_pages': top_pages,
        'country_stats': country_stats,
        'unique_ip_locations': unique_ip_locations,
        'map_data': json.dumps(map_data),
        'mapbox_token': settings.MAPBOX_TOKEN,
        'cwv': {k: round(v, 2) if v else 0 for k, v in cwv_stats.items()},
        'title': 'Analytics Dashboard'
    }
    
    return render(request, 'analytics/dashboard.html', context)