from django.test import TestCase
from django.urls import reverse

class AuthURLTest(TestCase):
    def test_login_url_exists(self):
        url = reverse("login")
        self.assertEqual(url, "/accounts/login/")

    def test_logout_url_exists(self):
        url = reverse("logout")
        self.assertEqual(url, "/accounts/logout/")

    def test_login_page_renders(self):
        url = reverse("login")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "registration/login.html")
        self.assertContains(response, "Login")

    def test_dashboard_requires_login(self):
        url = reverse("plexus:dashboard")
        response = self.client.get(url)
        # Should redirect to login
        self.assertEqual(response.status_code, 302)
        self.assertIn("/accounts/login/", response.url)

    def test_capture_requires_login(self):
        url = reverse("core:capture")
        response = self.client.get(url)
        # Should redirect to login
        self.assertEqual(response.status_code, 302)
        self.assertIn("/accounts/login/", response.url)
