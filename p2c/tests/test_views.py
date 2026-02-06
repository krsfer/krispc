import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, override_settings
from urllib.parse import urlparse
from p2c.models import Document
from p2c.tests.factories import UserFactory, DocumentFactory
from p2c.views import get_oauth_redirect_uri

@pytest.mark.django_db
class TestViews:
    @pytest.fixture
    def user(self):
        return UserFactory()

    @pytest.fixture
    def client(self, client, user):
        client.force_login(user)
        return client

    def test_home_view(self, client):
        response = client.get(reverse('p2c:home'))
        assert response.status_code == 200
        assert 'google_oauth2_client_id' in response.context

    def test_upload_pdf_view_success(self, client, mocker):
        # Mock parser factory
        mock_parser = mocker.MagicMock()
        mock_parser.extract_schedule_entries.return_value = [{"day": 1, "description": "Test"}]
        mock_parser._current_month = 1
        mock_parser._current_year = 2024
        
        mocker.patch("p2c.views.PDFParserFactory.create_parser", return_value=mock_parser)
        
        pdf_content = b"%PDF-1.4 test"
        pdf_file = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
        
        response = client.post(reverse('p2c:upload_pdf'), {'pdf_file': pdf_file}, follow=True)
        
        assert response.status_code == 200
        assert Document.objects.count() == 1
        messages = [m.message for m in list(response.context['messages'])]
        assert any("uploaded successfully" in m for m in messages)

    def test_upload_pdf_invalid_file(self, client):
        text_file = SimpleUploadedFile("test.txt", b"text content", content_type="text/plain")
        
        response = client.post(reverse('p2c:upload_pdf'), {'pdf_file': text_file}, follow=True)
        
        assert response.status_code == 200
        assert Document.objects.count() == 0
        messages = [m.message for m in list(response.context['messages'])]
        assert any("Invalid file type" in m for m in messages)

    def test_create_events_view(self, client, user, mocker):
        # Setup session with appointments
        session = client.session
        session['appointments'] = [{"summary": "Test", "start_time": "08:00", "end_time": "10:00", "year": 2024, "month": 1, "day": 1}]
        session.save()
        
        # Mock user profile credentials
        from p2c.models import P2CUserProfile
        from p2c.encryption_utils import encrypt_credentials
        import json
        
        profile, _ = P2CUserProfile.objects.get_or_create(user=user)
        creds = {"token": "fake"}
        profile.google_credentials = encrypt_credentials(json.dumps(creds))
        profile.save()
        
        # Mock task
        mock_task = mocker.patch("p2c.views.create_events_task.delay")
        mock_task.return_value.id = "task-123"
        
        document = DocumentFactory(user=user)
        
        response = client.post(reverse('p2c:create_events', args=[document.id]), {'calendar_id': 'cal-123'})
        
        assert response.status_code == 200
        assert response.json()['task_id'] == "task-123"
        mock_task.assert_called_once()

    @override_settings(GOOGLE_OAUTH2_REDIRECT_URI="http://localhost:8000/login/google/")
    def test_redirect_uri_prefers_setting(self):
        from django.conf import settings as dj_settings
        dj_settings.ALLOWED_HOSTS = ["p2c.localhost"]
        factory = RequestFactory()
        request = factory.get("/", HTTP_HOST="p2c.localhost:8000")
        uri = get_oauth_redirect_uri(request)
        assert uri == "http://p2c.localhost:8000/login/google/"

    def test_redirect_uri_falls_back_to_https_for_non_localhost(self, settings):
        settings.GOOGLE_OAUTH2_REDIRECT_URI = None
        settings.ALLOWED_HOSTS = ["p2c.krispc.fr"]
        factory = RequestFactory()
        request = factory.get("/", HTTP_HOST="p2c.krispc.fr")
        uri = get_oauth_redirect_uri(request)
        assert uri == "https://p2c.krispc.fr/login/google/"

    @override_settings(GOOGLE_OAUTH2_REDIRECT_URI="http://localhost:8000/login/google/")
    def test_redirect_uri_falls_back_when_env_host_differs(self):
        from django.conf import settings as dj_settings
        dj_settings.ALLOWED_HOSTS = ["p2c.localhost"]
        factory = RequestFactory()
        request = factory.get("/", HTTP_HOST="p2c.localhost:8000")
        uri = get_oauth_redirect_uri(request)
        parsed = urlparse(uri)
        assert parsed.hostname == "p2c.localhost"
        assert parsed.scheme == "http"
