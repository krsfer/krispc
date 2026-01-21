from django.test import TestCase, Client
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