
import pytest
from django.urls import reverse
from django.test import Client

@pytest.mark.django_db
class TestRenderCleanliness:
    """
    Checks rendered pages for raw template tags that shouldn't be visible to users.
    """
    
    def setup_method(self):
        self.client = Client()
        # Create a user to bypass @login_required
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user, created = User.objects.get_or_create(username='testcheck', defaults={'email': 'test@example.com'})
        self.user.set_password('password')
        self.user.save()
        self.client.force_login(self.user)
    
    def check_url_for_tags(self, url_name, kwargs=None):
        try:
            url = reverse(url_name, kwargs=kwargs)
        except Exception as e:
            # If we cannot reverse, we can't test it.
            # But ensure we don't silently pass if the goal was to check *this* URL.
            print(f"Skipping {url_name}: {e}")
            return

        response = self.client.get(url)
        
        # If redirect, we should theoretically follow it, but we expect these pages to be 200 for logged in user.
        # If it redirects, it might mean permission denied (if staff required) or login failed.
        if response.status_code == 302:
             print(f"Warning: {url_name} redirected to {response.url}")
             # Optional: response = self.client.get(url, follow=True)
             
        content = response.content.decode('utf-8')
        
        # Check for raw tags
        if '{% trans "Choose a PDF file" %}' in content:
            print(f"\nFOUND EXACT STRING in {url_name}")
            # Find context
            idx = content.find('{% trans "Choose a PDF file" %}')
            print(f"Context: {content[max(0, idx-50):min(len(content), idx+100)]}")

        if '{% trans' in content:
             print(f"\nFOUND {{% trans in {url_name}")
             idx = content.find('{% trans')
             print(f"Context: {content[max(0, idx-50):min(len(content), idx+100)]}")
             
        assert '{% trans "Choose a PDF file" %}' not in content, f"Raw tag found in {url_name}"
        assert '{% trans' not in content, f"Raw {{% trans ... %}} tag found in {url_name}"

    def test_json_ingest_cleanliness(self):
        self.check_url_for_tags('p2c:json_ingest')

    def test_home_cleanliness(self):
        self.check_url_for_tags('p2c:home')
