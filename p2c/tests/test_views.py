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

    def test_event_settings_page_uses_beneficiary_settings_section(self, client):
        response = client.get(reverse("p2c:event_settings"))
        content = response.content.decode()

        assert response.status_code == 200
        assert "Beneficiary Settings" in content
        assert "Add Beneficiary Setting" in content
        assert "Caregiver Settings" not in content
        assert "ondblclick=\"openEditBeneficiaryModal(" in content
        assert 'name="future_presence_color"' in content
        assert 'name="past_presence_color"' in content
        assert "#14532d" in content
        assert "#16a34a" in content

    def test_event_settings_delete_redirects_back_to_namespaced_page(self, client, user):
        user.is_staff = True
        user.save(update_fields=["is_staff"])
        response = client.post(
            reverse("p2c:event_settings_delete"),
            {"name": "DOES_NOT_EXIST"},
            follow=False,
        )

        assert response.status_code == 302
        assert response.url == reverse("p2c:event_settings")

    def test_home_view_displays_monthly_travel_distance(self, client, mocker):
        client.session["appointments"] = []
        session = client.session
        session["appointments"] = [
            {
                "description": "Doe John",
                "normalized_name": "DOE, John",
                "location": "Paris",
                "day": 1,
                "month": 1,
                "year": 2024,
                "start_time": "08:00",
                "end_time": "09:00",
            }
        ]
        session["source_type"] = "text"
        session["current_month"] = 1
        session["current_year"] = 2024
        session.save()

        mocker.patch(
            "p2c.views.compute_monthly_travel_summary",
            return_value={
                "has_distance": True,
                "total_distance_km": 12.4,
                "leg_count": 2,
                "appointment_count": 1,
                "missing_location_count": 0,
                "skipped_leg_count": 0,
                "used_base_location": False,
                "base_location": "",
                "algorithm": "round_trip_per_appointment",
                "trip_details": [
                    {
                        "day": 1,
                        "start_time": "08:00",
                        "end_time": "09:00",
                        "description": "Doe John",
                        "destination": "Paris",
                        "outbound_km": 6.1,
                        "return_km": 6.3,
                        "total_km": 12.4,
                        "fallback_used": True,
                        "route_source": "geodesic",
                    }
                ],
                "fallback_used": True,
            },
        )

        response = client.get(reverse("p2c:home"))
        content = response.content.decode()

        assert response.status_code == 200
        assert response.context["travel_summary"]["total_distance_km"] == 12.4
        assert response.context["travel_home_location"] == "63 Chemin du Claus, 06110 Le Cannet"
        assert "Monthly travel distance" in content
        assert "12.4" in content or "12,4" in content
        assert "Trip distance details" in content
        assert "Fallback used" in content

    def test_home_view_highlights_past_vs_today_and_future_entries(self, client, mocker):
        session = client.session
        session["appointments"] = [
            {
                "description": "Past visit",
                "normalized_name": "PAST, Visit",
                "location": "Past",
                "day": 11,
                "month": 4,
                "year": 2026,
                "start_time": "08:00",
                "end_time": "09:00",
            },
            {
                "description": "Future visit",
                "normalized_name": "FUTURE, Visit",
                "location": "Future",
                "day": 12,
                "month": 4,
                "year": 2026,
                "start_time": "10:00",
                "end_time": "11:00",
            },
        ]
        session["source_type"] = "text"
        session["current_month"] = 4
        session["current_year"] = 2026
        session.save()

        mocker.patch(
            "p2c.views.timezone.localdate",
            return_value=__import__("datetime").date(2026, 4, 12),
        )
        mocker.patch(
            "p2c.views.compute_monthly_travel_summary",
            return_value={
                "has_distance": True,
                "total_distance_km": 20.0,
                "leg_count": 4,
                "appointment_count": 2,
                "missing_location_count": 0,
                "skipped_leg_count": 0,
                "used_base_location": True,
                "base_location": "Home",
                "algorithm": "round_trip_per_appointment",
                "trip_details": [
                    {
                        "year": 2026,
                        "month": 4,
                        "day": 11,
                        "start_time": "08:00",
                        "end_time": "09:00",
                        "description": "Past visit",
                        "destination": "Past",
                        "outbound_km": 5.0,
                        "return_km": 5.0,
                        "total_km": 10.0,
                        "fallback_used": False,
                        "route_source": "mapbox",
                    },
                    {
                        "year": 2026,
                        "month": 4,
                        "day": 12,
                        "start_time": "10:00",
                        "end_time": "11:00",
                        "description": "Future visit",
                        "destination": "Future",
                        "outbound_km": 5.0,
                        "return_km": 5.0,
                        "total_km": 10.0,
                        "fallback_used": False,
                        "route_source": "mapbox",
                    },
                ],
                "fallback_used": False,
            },
        )

        response = client.get(reverse("p2c:home"))
        content = response.content.decode()

        assert response.status_code == 200
        assert "Past visit" in content
        assert "Future visit" in content
        assert "color: #16a34a;" in content
        assert "color: #14532d;" in content

    def test_home_view_uses_saved_presence_colors(self, client, user, mocker):
        user.p2c_profile.past_presence_color = "#15803d"
        user.p2c_profile.future_presence_color = "#052e16"
        user.p2c_profile.save(update_fields=["past_presence_color", "future_presence_color"])

        session = client.session
        session["appointments"] = [
            {
                "description": "Past visit",
                "normalized_name": "PAST, Visit",
                "location": "Past",
                "day": 11,
                "month": 4,
                "year": 2026,
                "start_time": "08:00",
                "end_time": "09:00",
            },
            {
                "description": "Future visit",
                "normalized_name": "FUTURE, Visit",
                "location": "Future",
                "day": 12,
                "month": 4,
                "year": 2026,
                "start_time": "10:00",
                "end_time": "11:00",
            },
        ]
        session["source_type"] = "text"
        session["current_month"] = 4
        session["current_year"] = 2026
        session.save()

        mocker.patch(
            "p2c.views.timezone.localdate",
            return_value=__import__("datetime").date(2026, 4, 12),
        )
        mocker.patch(
            "p2c.views.compute_monthly_travel_summary",
            return_value={
                "has_distance": True,
                "total_distance_km": 20.0,
                "leg_count": 4,
                "appointment_count": 2,
                "missing_location_count": 0,
                "skipped_leg_count": 0,
                "used_base_location": True,
                "base_location": "Home",
                "algorithm": "round_trip_per_appointment",
                "trip_details": [
                    {
                        "year": 2026,
                        "month": 4,
                        "day": 11,
                        "start_time": "08:00",
                        "end_time": "09:00",
                        "description": "Past visit",
                        "destination": "Past",
                        "outbound_km": 5.0,
                        "return_km": 5.0,
                        "total_km": 10.0,
                        "fallback_used": False,
                        "route_source": "mapbox",
                    },
                    {
                        "year": 2026,
                        "month": 4,
                        "day": 12,
                        "start_time": "10:00",
                        "end_time": "11:00",
                        "description": "Future visit",
                        "destination": "Future",
                        "outbound_km": 5.0,
                        "return_km": 5.0,
                        "total_km": 10.0,
                        "fallback_used": False,
                        "route_source": "mapbox",
                    },
                ],
                "fallback_used": False,
            },
        )

        response = client.get(reverse("p2c:home"))
        content = response.content.decode()

        assert response.status_code == 200
        assert "color: #15803d;" in content
        assert "color: #052e16;" in content

    def test_home_view_passes_user_home_location_to_travel_summary(self, client, user, mocker):
        user.p2c_profile.home_location = "1 Test Home, Le Cannet"
        user.p2c_profile.save(update_fields=["home_location"])

        session = client.session
        session["appointments"] = [
            {
                "description": "Doe John",
                "normalized_name": "DOE, John",
                "location": "Paris",
                "day": 1,
                "month": 1,
                "year": 2024,
                "start_time": "08:00",
                "end_time": "09:00",
            }
        ]
        session["source_type"] = "text"
        session.save()

        mocked = mocker.patch(
            "p2c.views.compute_monthly_travel_summary",
            return_value={
                "has_distance": False,
                "total_distance_km": None,
                "leg_count": 0,
                "appointment_count": 1,
                "missing_location_count": 0,
                "skipped_leg_count": 2,
                "used_base_location": False,
                "base_location": "",
                "algorithm": "round_trip_per_appointment",
                "trip_details": [],
                "fallback_used": False,
            },
        )

        response = client.get(reverse("p2c:home"))

        assert response.status_code == 200
        mocked.assert_called_once()
        assert mocked.call_args.kwargs["base_location"] == "1 Test Home, Le Cannet"

    def test_travel_settings_update_persists_home_location_and_presence_colors(self, client, user):
        response = client.post(
            reverse("p2c:travel_settings_update"),
            {
                "home_location": "63 Chemin du Claus, 06110 Le Cannet",
                "past_presence_color": "#22c55e",
                "future_presence_color": "#14532d",
            },
            follow=True,
        )

        user.refresh_from_db()
        assert response.status_code == 200
        assert user.p2c_profile.home_location == "63 Chemin du Claus, 06110 Le Cannet"
        assert user.p2c_profile.past_presence_color == "#22c55e"
        assert user.p2c_profile.future_presence_color == "#14532d"

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
