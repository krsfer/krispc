"""
Comprehensive test suite for krispc services.
"""
from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings

from krispc.services import send_contact_email


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class EmailServiceTest(TestCase):
    """Test cases for email service functions."""

    def setUp(self):
        """Set up test data."""
        self.valid_email_data = {
            "firstname": "John",
            "surname": "Doe",
            "client_email": "john@example.com",
            "msg": "This is a test message",
        }

    def test_send_contact_email_success(self):
        """Test that contact email is sent successfully."""
        result = send_contact_email(**self.valid_email_data)

        self.assertEqual(result, "ok")
        self.assertEqual(len(mail.outbox), 1)

    def test_send_contact_email_subject(self):
        """Test that email has correct subject."""
        send_contact_email(**self.valid_email_data)

        message = mail.outbox[0]
        self.assertIn("John", message.subject)

    def test_send_contact_email_recipient(self):
        """Test that email is sent to correct recipient."""
        send_contact_email(**self.valid_email_data)

        message = mail.outbox[0]
        self.assertIn("hello.krispc@gmail.com", message.to)

    def test_send_contact_email_with_unicode(self):
        """Test sending email with unicode characters."""
        unicode_data = {
            "firstname": "François",
            "surname": "Müller",
            "client_email": "francois@example.com",
            "msg": "Bonjour! J'ai besoin d'aide avec mon ordinateur. 中文测试",
        }

        result = send_contact_email(**unicode_data)

        self.assertEqual(result, "ok")
        self.assertEqual(len(mail.outbox), 1)

    def test_send_contact_email_with_long_message(self):
        """Test sending email with very long message."""
        long_data = self.valid_email_data.copy()
        long_data["msg"] = "X" * 5000

        result = send_contact_email(**long_data)

        self.assertEqual(result, "ok")

    def test_send_contact_email_with_html_in_message(self):
        """Test that HTML in message is handled properly."""
        html_data = self.valid_email_data.copy()
        html_data["msg"] = '<script>alert("xss")</script> Regular message'

        result = send_contact_email(**html_data)

        self.assertEqual(result, "ok")
        message = mail.outbox[0]
        self.assertTrue(message.alternatives)
        self.assertIn("<script>", message.alternatives[0][0])

    @patch("krispc.services.EmailMultiAlternatives.send", side_effect=Exception("SMTP error"))
    def test_send_contact_email_send_error(self, _mock_send):
        """Test handling of email backend errors."""
        result = send_contact_email(**self.valid_email_data)

        self.assertEqual(result, "error")

    def test_send_contact_email_multiple_calls(self):
        """Test sending multiple emails in succession."""
        send_contact_email(**self.valid_email_data)

        different_data = {
            "firstname": "Jane",
            "surname": "Smith",
            "client_email": "jane@example.com",
            "msg": "Different message",
        }
        send_contact_email(**different_data)

        self.assertEqual(len(mail.outbox), 2)
