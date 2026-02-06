import pytest
from django.test import Client
from django.urls import reverse


@pytest.mark.django_db
class TestUIRefresh:
    def setup_method(self):
        self.client = Client()

    def test_global_fonts_and_body_classes(self):
        urls = [
            reverse('hub:index'),
            reverse('krispc:index'),
            reverse('p2c:home'),
            reverse('plexus:index'),
        ]
        for url in urls:
            response = self.client.get(url, follow=True)
            assert response.status_code == 200
            content = response.content.decode('utf-8')
            assert 'Playfair Display' in content
            assert 'Source Sans 3' in content
            assert 'bg-stone-50' in content
            assert 'text-stone-900' in content

    def test_no_emoji_icons_in_hub_or_plexus(self):
        hub = self.client.get(reverse('hub:index'), follow=True)
        plexus = self.client.get(reverse('plexus:index'), follow=True)
        content = hub.content.decode('utf-8') + plexus.content.decode('utf-8')
        for emoji in ['🖥️', '📅', '🪞', '🎨', '⚙️', '📊', '🎙️']:
            assert emoji not in content
