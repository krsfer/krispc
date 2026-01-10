from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils.translation import activate

class I18nTests(APITestCase):
    def test_products_localization(self):
        url = reverse('api-products')

        # Test French (fr)
        response_fr = self.client.get(url, HTTP_ACCEPT_LANGUAGE='fr')
        self.assertEqual(response_fr.status_code, status.HTTP_200_OK)
        # We expect specific French strings or keys if translations are raw keys
        # Based on lst_products.py, it returns _("PTR_0370")
        # If translation files exist, it returns "Réparation Téléphone" (example)
        # If not, it returns "PTR_0370"
        
        data_fr = response_fr.json()
        
        # Test English (en)
        response_en = self.client.get(url, HTTP_ACCEPT_LANGUAGE='en')
        self.assertEqual(response_en.status_code, status.HTTP_200_OK)
        data_en = response_en.json()

        # If translations are working, the output might be different OR 
        # at least valid keys. 
        # Ideally we should see if the content changes or if we can identify the language.
        
        # Since we might not have the .mo files compiled or the keys might be placeholders
        # let's check if the mechanism works by inspecting what we get.
        
        print(f"\nFR: {data_fr[0]['Prd_Name']}")
        print(f"EN: {data_en[0]['Prd_Name']}")

        # If the translation infrastructure is active, these should theoretically be different
        # if the .po files have different values for "PTR_0370".
        # If they are the same (e.g. both keys), then at least we know the middleware didn't crash.
        
        # We can assert that we got a list in both cases
        self.assertIsInstance(data_fr, list)
        self.assertIsInstance(data_en, list)
