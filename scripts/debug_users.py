
import os
import sys
import django

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_main.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print(f"Using User model: {User._meta.label}")

superusers = User.objects.filter(is_superuser=True)

if superusers.exists():
    print("Existing superusers:")
    for user in superusers:
        print(f"- Username: {user.username}, Email: {user.email}, Is Active: {user.is_active}")
        
    # Reset 'admin' if it exists, or the first superuser found
    target_user = superusers.filter(username='admin').first()
    if not target_user:
        target_user = superusers.first()
        print(f"User 'admin' not found. Resetting password for '{target_user.username}' instead.")
    else:
        print(f"Resetting password for 'admin'.")

    target_user.set_password('admin')
    target_user.save()
    print(f"SUCCESS: Password for '{target_user.username}' has been set to 'admin'.")

else:
    print("No superusers found. Creating 'admin'...")
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print("SUCCESS: Superuser 'admin' created with password 'admin'.")
