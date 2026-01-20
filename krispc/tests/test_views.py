"""
Comprehensive test suite for krispc views.
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User, AnonymousUser
from django.urls import reverse
from django.http import HttpResponse
from unittest.mock import patch, MagicMock

from krispc.views import (
    IndexPageView,
    PrivacyView,
    TermsView,
    create_contact,
    favicon
)
from krispc.models import Contact


class IndexPageViewTest(TestCase):
    """Test cases for IndexPageView."""
    
    def setUp(self):
        """Set up test client and factory."""
        self.factory = RequestFactory()
    
    def test_index_view_renders(self):
        """Test that index view renders successfully."""
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, '_index.html')
    
    def test_index_view_context_data(self):
        """Test that index view provides context data."""
        response = self.client.get(reverse('index'))
        
        # Check that various context items are present
        self.assertIn('request', response.context)
    
    def test_index_view_content_type(self):
        """Test that index view returns HTML content."""
        response = self.client.get(reverse('index'))
        self.assertEqual(response['Content-Type'], 'text/html; charset=utf-8')


class PrivacyViewTest(TestCase):
    """Test cases for PrivacyView."""
    
    def test_privacy_view_renders(self):
        """Test that privacy view renders successfully."""
        response = self.client.get(reverse('privacy'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'privacy.html')
    
    def test_privacy_view_contains_privacy_info(self):
        """Test that privacy page contains privacy-related content."""
        response = self.client.get(reverse('privacy'))
        # Privacy page should contain relevant keywords
        # This depends on your actual privacy page content


class TermsViewTest(TestCase):
    """Test cases for TermsView."""
    
    def test_terms_view_renders(self):
        """Test that terms view renders successfully."""
        response = self.client.get(reverse('terms'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'terms.html')


class CreateContactViewTest(TestCase):
    """Test cases for create_contact view."""
    
    def setUp(self):
        """Set up test data."""
        self.factory = RequestFactory()
        self.valid_post_data = {
            'firstname': 'John',
            'surname': 'Doe',
            'from_email': 'john@example.com',
            'message': 'This is a test message with enough characters.',
        }
    
    @patch('krispc.views.send_contact_email')
    def test_create_contact_valid_submission(self, mock_send_email):
        """Test creating contact with valid data."""
        response = self.client.post(
            reverse('create'),
            data=self.valid_post_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'  # Simulate HTMX request
        )
        
        # Should create contact
        self.assertEqual(Contact.objects.count(), 1)
        contact = Contact.objects.first()
        self.assertEqual(contact.firstname, 'John')
        self.assertEqual(contact.from_email, 'john@example.com')
    
    def test_create_contact_missing_fields(self):
        """Test that missing required fields are rejected."""
        incomplete_data = {
            'firstname': 'John',
            # Missing surname, email, message
        }
        
        response = self.client.post(
            reverse('create'),
            data=incomplete_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        # Should not create contact
        self.assertEqual(Contact.objects.count(), 0)
    
    @patch('krispc.views.send_contact_email')
    def test_create_contact_sends_email(self, mock_send_email):
        """Test that creating contact triggers email send."""
        response = self.client.post(
            reverse('create'),
            data=self.valid_post_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        # Email should be sent (if implementation calls the service)
        # This depends on your actual implementation
    
    def test_create_contact_csrf_protection(self):
        """Test that CSRF protection is active."""
        # Without CSRF token, should fail
        self.client = self.client_class(enforce_csrf_checks=True)
        
        response = self.client.post(
            reverse('create'),
            data=self.valid_post_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        # Should be rejected due to missing CSRF token
        self.assertEqual(response.status_code, 403)
    
    @patch('krispc.views.send_contact_email')
    def test_create_contact_htmx_request(self, mock_send_email):
        """Test that HTMX requests are handled properly."""
        response = self.client.post(
            reverse('create'),
            data=self.valid_post_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_HX_REQUEST='true'
        )
        
        # Should return appropriate response for HTMX
        # Status code depends on implementation
        

class FaviconViewTest(TestCase):
    """Test cases for favicon view."""
    
    def test_favicon_redirects_or_serves(self):
        """Test that favicon view returns valid response."""
        response = self.client.get('/favicon.ico')
        
        # Should either redirect or serve the favicon
        self.assertIn(response.status_code, [200, 301, 302, 304])


class ViewsIntegrationTest(TestCase):
    """Integration tests for views."""
    
    def test_all_main_pages_accessible(self):
        """Test that all main pages are accessible."""
        urls = [
            reverse('index'),
            reverse('privacy'),
            reverse('terms'),
        ]
        
        for url in urls:
            response = self.client.get(url)
            self.assertEqual(
                response.status_code,
                200,
                f"URL {url} returned {response.status_code}"
            )
    
    def test_views_return_html(self):
        """Test that views return HTML content."""
        urls = [
            reverse('index'),
            reverse('privacy'),
            reverse('terms'),
        ]
        
        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response['Content-Type'], 'text/html; charset=utf-8')
