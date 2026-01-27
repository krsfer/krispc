import pytest
from django.test import Client
from django.urls import reverse

@pytest.mark.django_db
class TestUIStandardization:
    """
    Verifies that all apps conform to the Golden Standard stack:
    - Tailwind CSS (via Vite)
    - HTMX
    - No Bootstrap
    - Shared 'data-theme-version'
    """

    def setup_method(self):
        self.client = Client()
        self.app_configs = [
            {'url': reverse('hub:index'), 'name': 'Hub'},
            {'url': reverse('krispc:index'), 'name': 'KrisPC'},
            {'url': reverse('plexus:index'), 'name': 'Plexus'},
            {'url': reverse('p2c:home'), 'name': 'Pdf2Cal'},
        ]

    def test_standards_file_exists(self):
        import os
        assert os.path.exists('STANDARDS.md'), "STANDARDS.md is missing from root"

    def test_golden_stack_presence(self):
        for app in self.app_configs:
            response = self.client.get(app['url'], follow=True)
            assert response.status_code == 200, f"Failed to load {app['name']} at {app['url']}"
            
            content = response.content.decode('utf-8')
            
            # 1. Check for shared attribute
            assert 'data-theme-version="v2"' in content, f"{app['name']} missing data-theme-version=\"v2\""
            
            # 2. Check for HTMX
            assert 'htmx' in content.lower(), f"{app['name']} missing HTMX"
            
            # 3. Check for Vite Asset Tag
            # We look for 'vite' or the specific entry point 'main.js' or similar markers
            assert ('vite' in content.lower() or 'main.js' in content.lower()), f"{app['name']} missing Vite assets"
            
            # 4. Check for ABSENCE of Bootstrap
            assert 'bootstrap.min.css' not in content, f"{app['name']} still contains Bootstrap CSS"
            assert 'bootstrap.min.js' not in content, f"{app['name']} still contains Bootstrap JS"
            assert 'cdn.jsdelivr.net/npm/bootstrap' not in content, f"{app['name']} still contains Bootstrap CDN"
