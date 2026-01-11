"""
Comprehensive test suite for krispc serializers.
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import serializers as drf_serializers
from krispc.models import Contact
from krispc.serializers import ContactSerializer
from krispc.api_serializers import ServiceSerializer, ColophonSerializer, MarqueSerializer


class ContactSerializerTest(TestCase):
    """Test cases for ContactSerializer."""
    
    def setUp(self):
        """Set up test data."""
        self.valid_data = {
            'firstname': 'John',
            'surname': 'Doe',
            'from_email': 'john@example.com',
            'message': 'This is a valid message with enough characters.',
            'website': ''  # Honeypot field, should be empty
        }
    
    def test_serializer_with_valid_data(self):
        """Test serializer validates and saves valid data."""
        serializer = ContactSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        contact = serializer.save()
        
        self.assertEqual(contact.firstname, 'John')
        self.assertEqual(contact.surname, 'Doe')
        self.assertEqual(contact.from_email, 'john@example.com')
        self.assertIsNotNone(contact.created_at)
    
    def test_serializer_honeypot_rejection(self):
        """Test that filled honeypot field is rejected."""
        data = self.valid_data.copy()
        data['website'] = 'http://spam.com'
        
        serializer = ContactSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('Invalid submission', str(serializer.errors))
    
    def test_serializer_message_too_short(self):
        """Test that short messages are rejected."""
        data = self.valid_data.copy()
        data['message'] = 'Short'
        
        serializer = ContactSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('message', serializer.errors)
    
    def test_serializer_message_minimum_length(self):
        """Test message with exactly 10 characters passes."""
        data = self.valid_data.copy()
        data['message'] = '1234567890'  # Exactly 10 characters
        
        serializer = ContactSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_serializer_missing_required_fields(self):
        """Test that missing required fields are rejected."""
        # Missing firstname
        data = {'surname': 'Doe', 'from_email': 'john@example.com', 'message': 'Test message here'}
        serializer = ContactSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('firstname', serializer.errors)
    
    def test_serializer_invalid_email(self):
        """Test that invalid email format is rejected."""
        data = self.valid_data.copy()
        data['from_email'] = 'not-an-email'
        
        serializer = ContactSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('from_email', serializer.errors)
    
    def test_serializer_read_only_fields(self):
        """Test that read-only fields cannot be set via serializer."""
        data = self.valid_data.copy()
        data['id'] = 999
        data['created_at'] = '2020-01-01T00:00:00Z'
        
        serializer = ContactSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        contact = serializer.save()
        
        # ID should be auto-assigned, not 999
        self.assertNotEqual(contact.id, 999)
    
    def test_serializer_output_includes_timestamps(self):
        """Test that serialized output includes timestamp fields."""
        contact = Contact.objects.create(
            firstname='Test',
            surname='User',
            from_email='test@example.com',
            message='Test message content'
        )
        
        serializer = ContactSerializer(contact)
        data = serializer.data
        
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
        self.assertIn('id', data)
    
    def test_serializer_output_excludes_honeypot(self):
        """Test that honeypot field is not in serialized output."""
        contact = Contact.objects.create(
            firstname='Test',
            surname='User',
            from_email='test@example.com',
            message='Test message content'
        )
        
        serializer = ContactSerializer(contact)
        data = serializer.data
        
        # website field should not appear in output (write_only=True)
        self.assertNotIn('website', data)
    
    def test_serializer_unicode_content(self):
        """Test serializer handles unicode/international characters."""
        data = {
            'firstname': 'François',
            'surname': 'Müller',
            'from_email': 'françois@example.com',
            'message': 'Bonjour! J\'ai besoin d\'aide. 中文测试',
            'website': ''
        }
        
        serializer = ContactSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        contact = serializer.save()
        
        self.assertEqual(contact.firstname, 'François')
        self.assertIn('中文', contact.message)
    
    def test_serializer_html_in_message(self):
        """Test serializer accepts (but doesn't render) HTML in message."""
        data = self.valid_data.copy()
        data['message'] = '\u003cscript\u003ealert("xss")\u003c/script\u003e This is a message with HTML'
        
        serializer = ContactSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        contact = serializer.save()
        
        # HTML should be stored as-is (escaping happens at display time)
        self.assertIn('<script>', contact.message)


class ServiceSerializerTest(TestCase):
    """Test cases for ServiceSerializer."""
    
    def test_service_serializer_structure(self):
        """Test service serializer validates expected structure."""
        data = {
            'Prd_Icon': 'bi-laptop',
            'Prd_Name': 'Computer Repair',
            'Prd_Desc': 'Professional repair services',
            'Prd_More': 'Learn more'
        }
        
        serializer = ServiceSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class ColophonSerializerTest(TestCase):
    """Test cases for ColophonSerializer."""
    
    def test_colophon_serializer_structure(self):
        """Test colophon serializer validates expected structure."""
        data = {
            'Colophon_Title': 'Django',
            'Colophon_Icon': 'devicon-django-plain',
            'Colophon_Link': 'https://www.djangoproject.com/'
        }
        
        serializer = ColophonSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class MarqueSerializerTest(TestCase):
    """Test cases for MarqueSerializer."""
    
    def test_marque_serializer_structure(self):
        """Test marque serializer validates expected structure."""
        data = {
            'Marque_Title': 'HP',
            'Marque_Icon': 'devicon-hp-plain'
        }
        
        serializer = MarqueSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
