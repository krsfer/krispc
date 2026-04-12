from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from .models import PageVisit, UserInteraction

class AnalyticsApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.init_url = reverse('track_init')

    def test_track_visit_lifecycle(self):
        # 1. Init
        response = self.client.post(self.init_url, {
            'url': 'http://example.com/test',
            'path': '/test',
            'browser': 'TestBrowser',
            'os': 'TestOS'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        visit_id = response.json()['visit_id']
        self.assertTrue(visit_id)
        
        visit = PageVisit.objects.get(id=visit_id)
        self.assertEqual(visit.url, 'http://example.com/test')
        self.assertEqual(visit.browser, 'TestBrowser')

        # 2. Update
        update_url = reverse('track_update', args=[visit_id])
        response = self.client.post(update_url, {
            'ttfb': 120.5,
            'scroll_depth': 50
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        visit.refresh_from_db()
        self.assertEqual(visit.ttfb, 120.5)
        self.assertEqual(visit.scroll_depth, 50.0)

        # 3. Interaction
        interaction_url = reverse('track_interaction', args=[visit_id])
        response = self.client.post(interaction_url, {
            'type': 'rage_click',
            'selector': '#submit-btn'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        self.assertEqual(UserInteraction.objects.count(), 1)
        interaction = UserInteraction.objects.first()
        self.assertEqual(interaction.interaction_type, 'rage_click')
        self.assertEqual(interaction.visit, visit)

    @patch('analytics.api_views.resolve_geoip.delay', side_effect=RuntimeError('celery unavailable'))
    def test_track_visit_succeeds_when_geoip_dispatch_fails(self, mock_delay):
        response = self.client.post(self.init_url, {
            'url': 'http://example.com/fallback',
            'path': '/fallback',
            'browser': 'TestBrowser',
            'os': 'TestOS',
        }, content_type='application/json')

        self.assertEqual(response.status_code, 200)
        visit_id = response.json()['visit_id']
        self.assertTrue(PageVisit.objects.filter(id=visit_id).exists())
        mock_delay.assert_called_once_with(visit_id)


@override_settings(ALLOWED_HOSTS=["p2c.localhost", "testserver", "localhost"])
class AnalyticsAdminTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="password123",
        )
        self.client.force_login(self.user)

    def test_pagevisit_admin_changelist_renders_without_dashboard_url_on_p2c_subdomain(self):
        response = self.client.get(
            "/admin/analytics/pagevisit/",
            HTTP_HOST="p2c.localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Page Visit")
        self.assertNotContains(response, "View Dashboard")
