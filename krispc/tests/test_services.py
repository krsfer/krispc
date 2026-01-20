"""
Comprehensive test suite for krispc services.
"""
from django.test import TestCase
from django.core import mail
from unittest.mock import patch, MagicMock, call
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
    
    def test_send_contact_email_success(self):
        """Test that contact email is sent successfully."""
        # Clear the test outbox before the test
        mail.outbox = []
        
        send_contact_email(**self.valid_email_data)
        
        # Check that an email was sent
        self.assertEqual(len(mail.outbox), 1)
        
        # Check email properties
        email = mail.outbox[0]
        self.assertIn('John', email.body)
        self.assertIn('Doe', email.body)
        self.assertIn('john@example.com', email.body)
        self.assertIn('This is a test message', email.body)
    
    def test_send_contact_email_subject(self):
        """Test that email has correct subject."""
        mail.outbox = []
        
        send_contact_email(**self.valid_email_data)
        
        email = mail.outbox[0]
        # Subject should contain contact or form related text
        self.assertTrue(len(email.subject) > 0)
    
    def test_send_contact_email_recipient(self):
        """Test that email is sent to correct recipient."""
        mail.outbox = []
        
        send_contact_email(**self.valid_email_data)
        
        email = mail.outbox[0]
        # Email should have recipients
        self.assertTrue(len(email.to) > 0)
    
    def test_send_contact_email_with_unicode(self):
        """Test sending email with unicode characters."""
        mail.outbox = []
        
        unicode_data = {
            'firstname': 'François',
            'surname': 'Müller',
            'client_email': 'françois@example.com',
            'msg': 'Bonjour! J\'ai besoin d\'aide avec mon ordinateur. 中文测试'
        }
        
        send_contact_email(**unicode_data)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('François', email.body)
    
    def test_send_contact_email_with_long_message(self):
        """Test sending email with very long message."""
        mail.outbox = []
        
        long_data = self.valid_email_data.copy()
        long_data['msg'] = 'X' * 5000  # Very long message
        
        send_contact_email(**long_data)
        
        self.assertEqual(len(mail.outbox), 1)
    
    def test_send_contact_email_with_html_in_message(self):
        """Test that HTML in message is handled properly."""
        mail.outbox = []
        
        html_data = self.valid_email_data.copy()
        html_data['msg'] = '\u003cscript\u003ealert("xss")\u003c/script\u003e Regular message'
        
        send_contact_email(**html_data)
        
        self.assertEqual(len(mail.outbox), 1)
        # HTML should be in the email (escaping happens at display/render time)
        email = mail.outbox[0]
        self.assertIn('Regular message', email.body)
    
    @patch('krispc.services.send_mail')
    def test_send_contact_email_smtp_error(self, mock_send_mail):
        """Test handling of SMTP errors."""
        # Simulate SMTP error
        mock_send_mail.side_effect = smtplib.SMTPException("SMTP connection failed")
        
        # Should raise exception or handle gracefully depending on implementation
        with self.assertRaises(Exception):
            send_contact_email(**self.valid_email_data)
    
    def test_send_contact_email_with_empty_fields(self):
        """Test sending email with empty optional fields."""
        mail.outbox = []
        
        # Some implementations might have empty firstname/surname
        minimal_data = {
            'firstname': '',
            'surname': '',
            'client_email': 'test@example.com',
            'msg': 'Test message content here'
        }
        
        # Should still work with empty name fields
        send_contact_email(**minimal_data)
        
        self.assertEqual(len(mail.outbox), 1)
    
    def test_send_contact_email_multiple_calls(self):
        """Test sending multiple emails in succession."""
        mail.outbox = []
        
        send_contact_email(**self.valid_email_data)
        
        different_data = {
            'firstname': 'Jane',
            'surname': 'Smith',
            'client_email': 'jane@example.com',
            'msg': 'Different message'
        }
        send_contact_email(**different_data)
        
        self.assertEqual(len(mail.outbox), 2)
        
        # Verify both emails are different
        self.assertIn('John', mail.outbox[0].body)
        self.assertIn('Jane', mail.outbox[1].body)
