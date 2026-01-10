from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Contact

class KrisPCAPITests(APITestCase):
    def test_get_products(self):
        url = reverse('api-products')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(response.data, list))

    def test_get_colophon(self):
        url = reverse('api-colophon')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(response.data, list))

    def test_get_marques(self):
        url = reverse('api-marques')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(response.data, list))

    def test_get_villes(self):
        url = reverse('api-villes')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(response.data, list))

    def test_create_contact(self):
        url = reverse('contact-list') # Standard router name for list/create
        data = {
            'firstname': 'John',
            'surname': 'Doe',
            'from_email': 'john@example.com',
            'message': 'Hello, I need help.'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Contact.objects.count(), 1)
        self.assertEqual(Contact.objects.get().firstname, 'John')
