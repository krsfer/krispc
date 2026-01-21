from django.test import TestCase
from django.utils import translation
from krispc.pricelist import get_pricelist, format_pricelist_as_text, format_services_as_text

class PricelistTest(TestCase):
    def test_get_pricelist_structure(self):
        """Test the structure of the pricelist dictionary."""
        pricelist = get_pricelist()
        
        self.assertIn('currency', pricelist)
        self.assertEqual(pricelist['currency'], 'EUR')
        self.assertIn('services', pricelist)
        self.assertTrue(isinstance(pricelist['services'], list))
        
        # Check a service item
        service = pricelist['services'][0]
        self.assertIn('id', service)
        self.assertIn('name', service)
        self.assertIn('category', service)
        self.assertIn('pricing_type', service)

    def test_format_pricelist_as_text_french(self):
        """Test plain text formatting in French."""
        pricelist = get_pricelist()
        text = format_pricelist_as_text(pricelist, language='fr')
        
        self.assertIn("KRISPC - LISTE DES TARIFS", text)
        self.assertIn("Devise: EUR", text)
        self.assertIn("Tarif horaire", text)
        
    def test_format_pricelist_as_text_english(self):
        """Test plain text formatting in English."""
        pricelist = get_pricelist()
        text = format_pricelist_as_text(pricelist, language='en')
        
        self.assertIn("KRISPC - PRICE LIST", text)
        self.assertIn("Currency: EUR", text)
        self.assertIn("Hourly rate", text)

    def test_format_services_as_text_french(self):
        """Test services text formatting in French."""
        services = [
            {
                'Prd_Name': 'Service Test',
                'Prd_Desc': 'Description Test',
                'Prd_More': 'More Info'
            }
        ]
        text = format_services_as_text(services, language='fr')
        
        self.assertIn("KRISPC - SERVICES INFORMATIQUES", text)
        self.assertIn("Service Test", text)
        self.assertIn("Description Test", text)
        self.assertIn("More Info", text)

    def test_format_services_as_text_english(self):
        """Test services text formatting in English."""
        services = [
            {
                'Prd_Name': 'Service Test',
                'Prd_Desc': 'Description Test',
                'Prd_More': 'More Info'
            }
        ]
        text = format_services_as_text(services, language='en')
        
        self.assertIn("KRISPC - IT SERVICES", text)
