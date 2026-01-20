"""
Comprehensive test suite for krispc models.
"""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from krispc.models import Contact


class ContactModelTest(TestCase):
    """Test cases for the Contact model."""
    
    def setUp(self):
        """Set up test data for each test method."""
        self.valid_contact_data = {
            'firstname': 'John',
            'surname': 'Doe',
            'from_email': 'john.doe@example.com',
            'message': 'This is a test message that is long enough to pass validation.'
        }
    
    def test_create_contact(self):
        """Test creating a contact with valid data."""
        contact = Contact.objects.create(**self.valid_contact_data)
        
        self.assertEqual(contact.firstname, 'John')
        self.assertEqual(contact.surname, 'Doe')
        self.assertEqual(contact.from_email, 'john.doe@example.com')
        self.assertIn('test message', contact.message)
        self.assertIsNotNone(contact.id)
    
    def test_contact_str_method(self):
        """Test the __str__ method returns expected format."""
        contact = Contact.objects.create(**self.valid_contact_data)
        expected = f'From: {contact.from_email} Message: {contact.message}'
        self.assertEqual(str(contact), expected)
    
    def test_contact_timestamps(self):
        """Test that created_at and updated_at are set automatically."""
        contact = Contact.objects.create(**self.valid_contact_data)
        
        self.assertIsNotNone(contact.created_at)
        self.assertIsNotNone(contact.updated_at)
        self.assertAlmostEqual(
            contact.created_at.timestamp(),
            contact.updated_at.timestamp(),
            delta=1  # Within 1 second
        )
    
    def test_contact_updated_at_changes(self):
        """Test that updated_at changes when contact is modified."""
        contact = Contact.objects.create(**self.valid_contact_data)
        original_updated_at = contact.updated_at
        
        # Wait a moment and update
        contact.message = 'Updated message that is still long enough'
        contact.save()
        
        self.assertGreater(contact.updated_at, original_updated_at)
    
    def test_contact_ordering(self):
        """Test that contacts are ordered by created_at descending."""
        # Create contacts at different times
        contact1 = Contact.objects.create(
            firstname='First',
            surname='Contact',
            from_email='first@example.com',
           message='First contact message'
        )
        
        contact2 = Contact.objects.create(
            firstname='Second',
            surname='Contact',
            from_email='second@example.com',
            message='Second contact message'
        )
        
        contacts = list(Contact.objects.all())
        
        # Most recent should be first
        self.assertEqual(contacts[0].id, contact2.id)
        self.assertEqual(contacts[1].id, contact1.id)
    
    def test_contact_email_field(self):
        """Test email field validation."""
        contact = Contact.objects.create(**self.valid_contact_data)
        self.assertIn('@', contact.from_email)
        self.assertIn('.', contact.from_email)
    
    def test_contact_long_message(self):
        """Test contact with very long message."""
        long_message = 'X' * 5000  # Very long message
        contact = Contact.objects.create(
            firstname='Test',
            surname='User',
            from_email='test@example.com',
            message=long_message
        )
        self.assertEqual(len(contact.message), 5000)
    
    def test_contact_unicode_characters(self):
        """Test contact with unicode/international characters."""
        contact = Contact.objects.create(
            firstname='François',
            surname='Müller',
            from_email='françois@example.com',
            message='Bonjour! J\'ai besoin d\'aide avec mon ordinateur. 中文测试'
        )
        self.assertEqual(contact.firstname, 'François')
        self.assertIn('中文', contact.message)
    
    def test_multiple_contacts_same_email(self):
        """Test that multiple contacts can have the same email."""
        contact1 = Contact.objects.create(**self.valid_contact_data)
        contact2 = Contact.objects.create(**self.valid_contact_data)
        
        self.assertEqual(contact1.from_email, contact2.from_email)
        self.assertNotEqual(contact1.id, contact2.id)
    
    def test_contact_queryset_count(self):
        """Test querying contacts."""
        # Initially empty
        self.assertEqual(Contact.objects.count(), 0)
        
        # Create some contacts
        Contact.objects.create(**self.valid_contact_data)
        Contact.objects.create(**self.valid_contact_data)
        
        self.assertEqual(Contact.objects.count(), 2)
    
    def test_contact_filter_by_email(self):
        """Test filtering contacts by email."""
        Contact.objects.create(**self.valid_contact_data)
        Contact.objects.create(
            firstname='Jane',
            surname='Smith',
            from_email='jane@example.com',
            message='Different message here'
        )
        
        john_contacts = Contact.objects.filter(from_email='john.doe@example.com')
        self.assertEqual(john_contacts.count(), 1)
        self.assertEqual(john_contacts.first().firstname, 'John')
    
    def test_contact_delete(self):
        """Test deleting a contact."""
        contact = Contact.objects.create(**self.valid_contact_data)
        contact_id = contact.id
        
        contact.delete()
        
        self.assertEqual(Contact.objects.filter(id=contact_id).count(), 0)
    
    def test_contact_update(self):
        """Test updating contact fields."""
        contact = Contact.objects.create(**self.valid_contact_data)
        
        contact.firstname = 'Jane'
        contact.save()
        
        updated_contact = Contact.objects.get(id=contact.id)
        self.assertEqual(updated_contact.firstname, 'Jane')
