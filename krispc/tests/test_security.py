from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Contact

class SecurityTests(APITestCase):
    def setUp(self):
        self.url = reverse('contact-list')
        self.valid_data = {
            'firstname': 'Security',
            'surname': 'Tester',
            'from_email': 'security@test.com',
            'message': 'This is a valid message for testing security.'
        }

    def test_honeypot_rejection(self):
        """Ensure that filling the honeypot field results in a 400 error."""
        data = self.valid_data.copy()
        data['website'] = 'http://iamabot.com'
        
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Contact.objects.count(), 0)

    def test_message_too_short(self):
        """Ensure that short messages are rejected."""
        data = self.valid_data.copy()
        data['message'] = 'Hi'
        
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_valid_submission(self):
        """Ensure valid submission still works."""
        response = self.client.post(self.url, self.valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Contact.objects.count(), 1)
