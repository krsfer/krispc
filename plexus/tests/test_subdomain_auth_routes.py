from django.test import Client, TestCase, override_settings


@override_settings(ALLOWED_HOSTS=["*"])
class PlexusSubdomainAuthRouteTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_google_login_route_exists_on_plexus_subdomain(self):
        """
        On plexus subdomain, /en/login/google/ must resolve to an auth handler
        rather than returning 404.
        """
        response = self.client.get(
            "/en/login/google/?next=/en/capture/",
            HTTP_HOST="plexus.localhost:8000",
        )
        self.assertNotEqual(response.status_code, 404)

    def test_capture_redirects_to_login_page_not_oauth_callback(self):
        """
        Unauthenticated capture access should redirect to /login/, not directly to
        /login/google/ callback route.
        """
        response = self.client.get("/en/capture/", HTTP_HOST="plexus.localhost:8000")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/?next=/en/capture/", response["Location"])
        self.assertNotIn("/login/google/", response["Location"])
