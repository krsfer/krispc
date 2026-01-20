"""
Comprehensive test suite for krispc services.
"""
from django.test import TestCase, override_settings
from unittest.mock import patch, MagicMock
import smtplib

from krispc.services import send_contact_email


class EmailServiceTest(TestCase):
    """Test cases for email service functions."""
    
    def setUp(self):
        """Set up test data."""
        self.valid_email_data = {
            'firstname': 'John',
            'surname': 'Doe',
            'client_email': 'john@example.com',
            'msg': 'This is a test message'
        }
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_success(self, mock_sg_class):
        """Test that contact email is sent successfully."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        result = send_contact_email(**self.valid_email_data)
        
        # Check that SendGrid was called
        mock_sg.send.assert_called_once()
        self.assertEqual(result, "ok")
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_subject(self, mock_sg_class):
        """Test that email has correct subject."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        send_contact_email(**self.valid_email_data)
        
        # Get the Mail object that was passed to send()
        call_args = mock_sg.send.call_args
        mail_obj = call_args[0][0]
        
        # Subject should contain the first name
        self.assertIn('John', mail_obj.subject.get())
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_recipient(self, mock_sg_class):
        """Test that email is sent to correct recipient."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        send_contact_email(**self.valid_email_data)
        
        # Check SendGrid was called
        mock_sg.send.assert_called_once()
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_with_unicode(self, mock_sg_class):
        """Test sending email with unicode characters."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        unicode_data = {
            'firstname': 'François',
            'surname': 'Müller',
            'client_email': 'francois@example.com',
            'msg': 'Bonjour! J\'ai besoin d\'aide avec mon ordinateur. 中文测试'
        }
        
        result = send_contact_email(**unicode_data)
        
        self.assertEqual(result, "ok")
        mock_sg.send.assert_called_once()
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_with_long_message(self, mock_sg_class):
        """Test sending email with very long message."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        long_data = self.valid_email_data.copy()
        long_data['msg'] = 'X' * 5000  # Very long message
        
        result = send_contact_email(**long_data)
        
        self.assertEqual(result, "ok")
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_with_html_in_message(self, mock_sg_class):
        """Test that HTML in message is handled properly."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        html_data = self.valid_email_data.copy()
        html_data['msg'] = '<script>alert("xss")</script> Regular message'
        
        result = send_contact_email(**html_data)
        
        self.assertEqual(result, "ok")
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_sendgrid_error(self, mock_sg_class):
        """Test handling of SendGrid API errors."""
        mock_sg = MagicMock()
        mock_sg.send.side_effect = Exception("SendGrid API error")
        mock_sg_class.return_value = mock_sg
        
        result = send_contact_email(**self.valid_email_data)
        
        # Should return error status (not raise)
        self.assertEqual(result, "error")
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_with_empty_fields(self, mock_sg_class):
        """Test sending email with empty optional fields."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        minimal_data = {
            'firstname': '',
            'surname': '',
            'client_email': 'test@example.com',
            'msg': 'Test message content here'
        }
        
        result = send_contact_email(**minimal_data)
        
        self.assertEqual(result, "ok")
    
    @patch('krispc.services.SendGridAPIClient')
    @patch('krispc.services.SENDGRID_API_KEY', 'test-api-key')
    def test_send_contact_email_multiple_calls(self, mock_sg_class):
        """Test sending multiple emails in succession."""
        mock_sg = MagicMock()
        mock_sg.send.return_value.status_code = 202
        mock_sg_class.return_value = mock_sg
        
        send_contact_email(**self.valid_email_data)
        
        different_data = {
            'firstname': 'Jane',
            'surname': 'Smith',
            'client_email': 'jane@example.com',
            'msg': 'Different message'
        }
        send_contact_email(**different_data)
        
        # Should have been called twice
        self.assertEqual(mock_sg.send.call_count, 2)
    
    @patch('krispc.services.SENDGRID_API_KEY', None)
    def test_send_contact_email_no_api_key(self):
        """Test behavior when SendGrid API key is not set."""
        result = send_contact_email(**self.valid_email_data)
        
        # Should still return ok (just logs warning and skips)
        self.assertEqual(result, "ok")
