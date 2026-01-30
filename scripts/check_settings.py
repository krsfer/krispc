
import os
import sys
import django
from django.conf import settings

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_main.settings')
django.setup()

print(f"MEDIA_URL: '{settings.MEDIA_URL}'")
print(f"STATIC_URL: '{settings.STATIC_URL}'")
