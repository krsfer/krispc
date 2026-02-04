"""
API tests for the pattern generator endpoint.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import json


class PatternGeneratorAPITests(TestCase):
    """Test cases for the pattern generator API endpoint."""
    
    def setUp(self):
        """Set up test client."""
        self.client = APIClient()
        self.url = reverse('emoty_api:api-generate')
    
    def test_generate_pattern_json_response(self):
        """Test successful pattern generation with JSON response."""
        data = {'emojis': '🐋🐳🏵️'}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('emojis', response.data)
        self.assertIn('grid', response.data)
        self.assertIn('size', response.data)
        
        self.assertEqual(response.data['emojis'], '🐋🐳🏵️')
        self.assertEqual(response.data['size'], 5)
        self.assertEqual(len(response.data['grid']), 5)
        
        # Check that grid contains expected emojis
        grid_text = '\n'.join(response.data['grid'])
        self.assertIn('🐋', grid_text)
        self.assertIn('🐳', grid_text)
        # Check for flower emoji (may have variant selector)
        self.assertTrue('🏵' in grid_text or '🏵️' in grid_text)
    
    def test_generate_pattern_text_response(self):
        """Test pattern generation with text output format."""
        data = {'emojis': '🐋🐳'}
        response = self.client.post(f"{self.url}?output=text", data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/plain; charset=utf-8')
        
        # Response should be plain text with newlines
        text = response.content.decode('utf-8')
        lines = text.split('\n')
        self.assertEqual(len(lines), 3)  # 3x3 grid
        
        # Each line should contain emojis
        for line in lines:
            self.assertTrue(any(emoji in line for emoji in ['🐋', '🐳']))
    
    def test_single_emoji(self):
        """Test pattern generation with single emoji."""
        data = {'emojis': '🐋'}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['size'], 1)
        self.assertEqual(len(response.data['grid']), 1)
        self.assertEqual(response.data['grid'][0], '🐋')
    
    def test_complex_pattern(self):
        """Test pattern generation with multiple emojis."""
        data = {'emojis': '🐋🐳🏵️🌸🌺'}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['size'], 9)  # (5 * 2) - 1 = 9
        self.assertEqual(len(response.data['grid']), 9)
    
    def test_empty_emoji_sequence(self):
        """Test that empty emoji sequence returns error."""
        data = {'emojis': ''}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_missing_emojis_field(self):
        """Test that missing emojis field returns validation error."""
        data = {}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_invalid_characters(self):
        """Test that non-emoji characters return error."""
        data = {'emojis': 'abc123'}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_too_many_emojis(self):
        """Test that sequences exceeding max length return error."""
        # Create a sequence with 11 emojis (max is 10)
        data = {'emojis': '🐋' * 11}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_max_allowed_emojis(self):
        """Test pattern generation with maximum allowed emojis."""
        data = {'emojis': '🐋' * 10}  # Max is 10
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['size'], 19)  # (10 * 2) - 1 = 19
    
    def test_various_emoji_types(self):
        """Test with different types of emojis."""
        test_cases = [
            '❤️💙💚',  # Hearts
            '🌸🌺🌻',  # Flowers
            '🐶🐱🐭',  # Animals
            '🍎🍊🍋',  # Food
        ]
        
        for emojis in test_cases:
            with self.subTest(emojis=emojis):
                data = {'emojis': emojis}
                response = self.client.post(self.url, data, format='json')
                
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data['emojis'], emojis)
    
    def test_output_format_case_insensitive(self):
        """Test that output format parameter is case insensitive."""
        data = {'emojis': '🐋🐳'}
        
        # Test uppercase
        response = self.client.post(f"{self.url}?output=TEXT", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/plain; charset=utf-8')
        
        # Test mixed case
        response = self.client.post(f"{self.url}?output=Text", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/plain; charset=utf-8')
    
    def test_invalid_output_format_defaults_to_json(self):
        """Test that invalid output format defaults to JSON."""
        data = {'emojis': '🐋🐳'}
        response = self.client.post(f"{self.url}?output=invalid", data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return JSON response
        self.assertIn('grid', response.data)
        self.assertIn('size', response.data)
    
    def test_get_method_not_allowed(self):
        """Test that GET requests are not allowed."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_pattern_structure(self):
        """Test that the generated pattern has correct structure."""
        data = {'emojis': '🐋🐳🏵️'}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        grid = response.data['grid']
        size = response.data['size']
        
        # All rows should have the same length
        for row in grid:
            self.assertEqual(len(row), size)
        
        # Grid should be square
        self.assertEqual(len(grid), size)
