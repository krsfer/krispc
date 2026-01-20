from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import translation
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from plexus.models import Input

class VoiceCaptureApiTest(APITestCase):
    def setUp(self):
        self.url = reverse("plexus:voice_capture")
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_authenticate(user=self.user)

    @patch("plexus.views.transcribe_audio")
    def test_voice_capture_success(self, mock_transcribe):
        mock_transcribe.return_value = "Transcribed voice note"
        
        audio_file = SimpleUploadedFile("note.webm", b"audio data", content_type="audio/webm")
        data = {"audio": audio_file}
        
        with translation.override("en"):
            response = self.client.post(self.url, data, format="multipart")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Input.objects.count(), 1)
        
        input_obj = Input.objects.first()
        self.assertEqual(input_obj.content, "Transcribed voice note")
        self.assertEqual(input_obj.source, "voice")

    def test_voice_capture_no_file(self):
        with translation.override("en"):
            response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
