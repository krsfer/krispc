from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from unittest.mock import patch
from .models import Contact

class KrisPCAPITests(APITestCase):
    def setUp(self):
        self.contact_url = reverse('contact-list')
        self.products_url = reverse('api-products')
        
        # Create an admin user
        self.admin_user = User.objects.create_superuser('admin', 'admin@test.com', 'password123')
        # Create a normal user
        self.user = User.objects.create_user('user', 'user@test.com', 'password123')

    def test_get_products(self):
        response = self.client.get(self.products_url)
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

    @patch('krispc.api.send_contact_email')
    def test_create_contact_sends_email(self, mock_send_email):
        """
        Ensure POST creates a contact and calls send_contact_email.
        """
        data = {
            'firstname': 'John',
            'surname': 'Doe',
            'from_email': 'john@example.com',
            'message': 'Hello, I need help and this message is long enough.'
        }
        response = self.client.post(self.contact_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Contact.objects.count(), 1)
        self.assertEqual(Contact.objects.get().firstname, 'John')
        
        # Verify email function was called
        mock_send_email.assert_called_once_with(
            firstname='John',
            surname='Doe',
            client_email='john@example.com',
            msg='Hello, I need help and this message is long enough.'
        )

    def test_list_contacts_permissions(self):
        """
        Ensure GET /contacts/ is restricted to admins.
        """
        # Anonymous
        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Normal User
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin User
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)