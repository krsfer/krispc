import pytest
from unittest.mock import patch, MagicMock
from plexus.services.llm import classify_input
from plexus.models import SystemConfiguration

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

    @patch("plexus.services.llm.anthropic.Anthropic")
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False)
    def test_classify_input_anthropic_success(self, mock_anthropic_class):
        config = SystemConfiguration.get_solo()
        config.active_ai_provider = "anthropic"
        config.save()

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='''{
            "classification": "reference",
            "confidence_score": 0.8,
            "refined_content": "Document architecture notes",
            "actions": ["Tag as architecture"]
        }''')]
        mock_client.messages.create.return_value = mock_response

        result = classify_input("architecture notes")

        assert result["classification"] == "reference"
        assert result["confidence_score"] == 0.8
        assert result["refined_content"] == "Document architecture notes"
        assert result["actions"] == ["Tag as architecture"]
        assert "claude" in result["ai_model"]

    @patch("plexus.services.llm.anthropic.Anthropic")
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False)
    def test_classify_input_anthropic_invalid_json_fallback(self, mock_anthropic_class):
        config = SystemConfiguration.get_solo()
        config.active_ai_provider = "anthropic"
        config.save()

        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not-json")]
        mock_client.messages.create.return_value = mock_response

        result = classify_input("rough thought")

        assert result["classification"] == "ideation"
        assert result["refined_content"] == "rough thought"
        assert "anthropic-error" in result["ai_model"]
