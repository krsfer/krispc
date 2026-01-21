from celery import shared_task
import requests
from django.conf import settings
from .models import PageVisit

@shared_task
def resolve_geoip(visit_id):
    try:
        visit = PageVisit.objects.get(id=visit_id)
        ip = visit.ip_address
        
        # Skip local IPs or empty
        if not ip or ip in ['127.0.0.1', 'localhost', '::1']:
            return
            
        # Use ip-api.com (free, rate limited to 45/min)
        # In production, consider a paid service or local DB
        # Note: 'fields' param optimizes response
        response = requests.get(f'http://ip-api.com/json/{ip}?fields=status,country,regionName,city,lat,lon,zip,isp,org,timezone')
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                visit.country = data.get('country')
                visit.region = data.get('regionName')
                visit.city = data.get('city')
                visit.postal_code = data.get('zip')
                visit.latitude = data.get('lat')
                visit.longitude = data.get('lon')
                visit.timezone = data.get('timezone')
                visit.isp = data.get('isp')
                visit.organization = data.get('org')
                visit.save()
                
    except PageVisit.DoesNotExist:
        pass
    except Exception as e:
        print(f"GeoIP resolution failed: {e}")
