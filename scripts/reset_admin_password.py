
import os
import sys
import django

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_main.settings')
django.setup()

from django.contrib.auth.models import User

try:
    u = User.objects.get(username='admin')
    u.set_password('admin')
    u.save()
    print("Password for user 'admin' has been reset to 'admin'.")
except User.DoesNotExist:
    print("User 'admin' does not exist. Creating it now...")
    u = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print("Superuser 'admin' created with password 'admin'.")
except Exception as e:
    print(f"An error occurred: {e}")
