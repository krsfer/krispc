import pytest
from unittest.mock import patch, MagicMock
from plexus.services.llm import classify_input

@pytest.mark.django_db
class TestLLMService:
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
        
        assert result["classification"] == "task"
        assert result["confidence_score"] == 0.9
        assert result["refined_content"] == "Buy milk"
        assert len(result["actions"]) == 2

    @patch("plexus.services.llm.genai.Client")
    def test_classify_input_invalid_json(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.text = "invalid json"
        mock_client.models.generate_content.return_value = mock_response
        
        result = classify_input("error text")
        assert result["classification"] == "ideation" # Default
        assert result["refined_content"] == "error text"
