"""
Tests for language persistence across browser sessions.

These tests verify that the user's language preference is persisted
via cookies and correctly restored on subsequent visits.
"""
from django.test import TestCase, Client, override_settings
from django.conf import settings


class LanguageCookiePersistenceTests(TestCase):
    """Test that language preference is saved in cookies and persists across sessions."""

    def setUp(self):
        """Set up test client."""
        self.client = Client()

    def test_cookie_set_when_visiting_english_url(self):
        """Visiting /en/ should set the language cookie to 'en'."""
        response = self.client.get('/en/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.LANGUAGE_COOKIE_NAME, response.cookies)
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')

    def test_cookie_set_when_visiting_french_url(self):
        """Visiting root (/) should set the language cookie to 'fr'."""
        response = self.client.get('/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.LANGUAGE_COOKIE_NAME, response.cookies)
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'fr')

    def test_cookie_persists_without_session(self):
        """
        A new client with only a cookie (no session) should use the cookie language.
        
        This simulates closing and reopening the browser.
        """
        # First, visit English page to get the cookie
        response = self.client.get('/en/')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')
        
        # Create a brand new client (simulating new browser session)
        new_client = Client()
        
        # Set only the language cookie (no session)
        new_client.cookies[settings.LANGUAGE_COOKIE_NAME] = 'en'
        
        # Visit the root page (no language prefix)
        response = new_client.get('/')
        
        # Should redirect to English URL because preference is 'en'
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/en/')
        
        # Verify language is still en
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')

    def test_url_prefix_overrides_cookie(self):
        """Query param ?lang=fr should take priority over English cookie (effectively an override)."""
        # Set cookie to English
        self.client.cookies[settings.LANGUAGE_COOKIE_NAME] = 'en'
        
        # Visit French using query parameter explicitly
        # We use ?lang=fr to explicitly request French, overriding the English cookie
        response = self.client.get('/?lang=fr')
        
        # Should be successful (200), not a redirect
        self.assertEqual(response.status_code, 200)
        
        # Cookie should be updated to French
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'fr')
        
        # Now visit English explicitly
        self.client.cookies[settings.LANGUAGE_COOKIE_NAME] = 'fr'
        response = self.client.get('/en/')
        
        # Cookie should be updated to English
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')

    def test_cookie_expiry_is_one_year(self):
        """Cookie should have a max_age of approximately one year."""
        response = self.client.get('/')
        
        cookie = response.cookies.get(settings.LANGUAGE_COOKIE_NAME)
        self.assertIsNotNone(cookie)
        
        # Check max_age is set (should be 1 year = 31536000 seconds)
        expected_age = 60 * 60 * 24 * 365  # 1 year in seconds
        self.assertEqual(int(cookie['max-age']), expected_age)

    def test_cookie_settings_are_configured(self):
        """Verify language cookie settings are properly configured in settings."""
        self.assertTrue(hasattr(settings, 'LANGUAGE_COOKIE_NAME'))
        self.assertTrue(hasattr(settings, 'LANGUAGE_COOKIE_AGE'))
        self.assertEqual(settings.LANGUAGE_COOKIE_NAME, 'krispc_language')
        self.assertEqual(settings.LANGUAGE_COOKIE_AGE, 60 * 60 * 24 * 365)


class LanguageSwitchingTests(TestCase):
    """Test language switching via URL navigation."""

    def setUp(self):
        """Set up test client."""
        self.client = Client()

    def test_switch_from_french_to_english(self):
        """Switching from French to English updates the cookie."""
        # Start with French
        response = self.client.get('/')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'fr')
        
        # Switch to English
        response = self.client.get('/en/')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')

    def test_switch_from_english_to_french_using_query_param(self):
        """Switching from English to French requires explicit action if session is sticky."""
        # Start with English
        response = self.client.get('/en/')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')
        
        # Switch to French using query parameter since root '/' honors stickiness
        response = self.client.get('/?lang=fr')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'fr')

    def test_switch_from_english_path_with_query_param(self):
        """Switching from English URL (/en/) to French using query param should redirect to root."""
        # Start with English
        response = self.client.get('/en/')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')
        
        # Switch to French while on English URL
        response = self.client.get('/en/?lang=fr')
        
        # Should redirect to root (/) because /en/ is for English
        self.assertEqual(response.status_code, 302)
        # Verify redirect strips /en/ but keeps query param if possible (or just redirects to /)
        # My logic keeps query param
        self.assertEqual(response.url, '/?lang=fr')
        
        # Follow redirect
        response = self.client.get('/?lang=fr')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'fr')

    def test_switch_language_view(self):
        """Test the custom switch_language view."""
        # Start with English
        response = self.client.get('/en/')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')
        
        # Post to switch language view
        response = self.client.post('/switch-lang/', {'language': 'fr', 'next': '/'})
        
        # Should redirect to next url
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/')
        
        # Cookie should be updated to French
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'fr')
        
        # Follow redirect
        response = self.client.get('/')
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'fr')

    def test_cookie_samesite_attribute(self):
        """Cookie should have SameSite=Lax for security."""
        response = self.client.get('/')
        
        cookie = response.cookies.get(settings.LANGUAGE_COOKIE_NAME)
        self.assertIsNotNone(cookie)
        self.assertEqual(cookie['samesite'], 'Lax')
