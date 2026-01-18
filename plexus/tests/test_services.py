import unittest
from unittest.mock import patch, MagicMock
from plexus.services.llm import classify_input

class LLMServiceTest(unittest.TestCase):
    @patch("plexus.services.llm.genai.Client")
    def test_classify_input_success(self, mock_client_class):
        # Mocking Gemini response
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.text = '''{
            "classification": "task",
            "confidence_score": 0.9,
            "refined_content": "Buy milk",
            "actions": ["Go to store", "Get milk"]
        }'''
        mock_client.models.generate_content.return_value = mock_response
        
        result = classify_input("buy milk")
        
        self.assertEqual(result["classification"], "task")
        self.assertEqual(result["confidence_score"], 0.9)
        self.assertEqual(result["refined_content"], "Buy milk")
        self.assertEqual(len(result["actions"]), 2)

    @patch("plexus.services.llm.genai.Client")
    def test_classify_input_invalid_json(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.text = "invalid json"
        mock_client.models.generate_content.return_value = mock_response
        
        # Should handle parsing error and return basic structure or raise?
        # Let's assume it returns a default or handles it.
        result = classify_input("error text")
        self.assertEqual(result["classification"], "ideation") # Default
        self.assertEqual(result["refined_content"], "error text")

if __name__ == '__main__':
    unittest.main()
