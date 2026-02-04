import pytest
from django.test import Client
from django.urls import reverse


@pytest.mark.django_db
class TestEnvironmentAwareLinks:
    def setup_method(self):
        self.client = Client()

    def test_hub_homepage_global_nav_uses_localhost_links(self, settings):
        settings.ALLOWED_HOSTS = [".localhost", "testserver"]

        response = self.client.get(reverse("hub:index"), HTTP_HOST="hub.localhost:8000")
        assert response.status_code == 200
        content = response.content.decode("utf-8")

        assert 'href="http://com.localhost:8000"' in content
        assert 'href="http://p2c.localhost:8000"' in content
        assert 'href="http://plexus.localhost:8000"' in content
