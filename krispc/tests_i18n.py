from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import override_settings
from django.conf import settings

# Copy existing middleware but remove the custom one to isolate the issue
MIDDLEWARE_WITHOUT_CUSTOM = [m for m in settings.MIDDLEWARE if 'EnsureDefaultLanguageMiddleware' not in m]

class I18nTests(APITestCase):
    @override_settings(MIDDLEWARE=MIDDLEWARE_WITHOUT_CUSTOM)
    def test_products_localization(self):
        url = reverse('api-products')

        # Ensure clean state
        self.client.cookies.clear()
        if hasattr(self.client, 'session'):
            self.client.session.clear()

        # Test French (fr)
        response_fr = self.client.get(url, HTTP_ACCEPT_LANGUAGE='fr')
        self.assertEqual(response_fr.status_code, status.HTTP_200_OK)
        
        # Test English (en)
        self.client.cookies.clear()
        if hasattr(self.client, 'session'):
            self.client.session.clear()
            
        response_en = self.client.get(url, HTTP_ACCEPT_LANGUAGE='en')
        self.assertEqual(response_en.status_code, status.HTTP_200_OK)
        
        data_fr = response_fr.json()
        data_en = response_en.json()

        print(f"\nFR Header: {response_fr.get('Content-Language')}")
        print(f"EN Header: {response_en.get('Content-Language')}")
        
        print(f"FR Content: {data_fr[0]['Prd_Name']}")
        print(f"EN Content: {data_en[0]['Prd_Name']}")

        # Assert Content-Language header is correct
        self.assertEqual(response_fr.get('Content-Language'), 'fr')
        self.assertEqual(response_en.get('Content-Language'), 'en')
        
        # Assert content is different
        self.assertNotEqual(data_fr[0]['Prd_Name'], data_en[0]['Prd_Name'])
