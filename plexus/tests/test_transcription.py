from django.test import TestCase
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from plexus.services.transcription import transcribe_audio

class TranscriptionServiceTest(TestCase):
    @patch("plexus.services.transcription.OpenAI")
    def test_transcribe_audio_success(self, mock_openai):
        # Setup mock
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.text = "Hello world"
        mock_client.audio.transcriptions.create.return_value = mock_response

        # Create dummy file
        audio_file = SimpleUploadedFile("test.wav", b"dummy audio content")

        # Call service
        text = transcribe_audio(audio_file)

        # Verify
        self.assertEqual(text, "Hello world")
        mock_client.audio.transcriptions.create.assert_called_once()

    @patch("plexus.services.transcription.OpenAI")
    def test_transcribe_audio_failure(self, mock_openai):
        # Setup mock to raise exception
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.audio.transcriptions.create.side_effect = Exception("API Error")

        # Create dummy file
        audio_file = SimpleUploadedFile("test.wav", b"dummy audio content")

        # Call service
        text = transcribe_audio(audio_file)

        # Verify fallback or error handling
        self.assertIn("Error:", text)
