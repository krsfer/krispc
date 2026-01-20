from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import override_settings
from django.core.cache import cache
from rest_framework.settings import api_settings

class ThrottlingTests(APITestCase):
    def setUp(self):
        cache.clear()

    @override_settings(REST_FRAMEWORK={
        'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.ScopedRateThrottle'],
        'DEFAULT_THROTTLE_RATES': {
            'contacts': '2/minute',
            'read_only': '1/minute'
        }
    })
    def test_read_only_throttling(self):
        """
        Ensure read-only endpoints are throttled.
        """
        # Force reload of api_settings if needed (usually handled by override_settings)
        api_settings.reload()
        
        url = reverse('api-services')
        
        # Request 1: Should be OK (1/minute allowed)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Request 2: Should be throttled
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @override_settings(REST_FRAMEWORK={
        'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.ScopedRateThrottle'],
        'DEFAULT_THROTTLE_RATES': {
            'contacts': '2/minute',
            'read_only': '1/minute'
        }
    })
    def test_contacts_throttling(self):
        # Force reload of api_settings
        api_settings.reload()

        url = reverse('contact-list')
        data = {
            'firstname': 'Test',
            'surname': 'User',
            'from_email': 'test@example.com',
            'message': 'Valid message.'
        }

        # Request 1: OK
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Request 2: OK (2/minute allowed)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Request 3: Throttled
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)