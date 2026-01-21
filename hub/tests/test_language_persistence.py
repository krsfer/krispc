from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.conf import settings


class LanguagePersistenceTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_language_cookie_is_set(self):
        """
        Test that the set_language view sets the language cookie correctly.
        """
        # Set language to English
        response = self.client.post(
            '/i18n/setlang/', 
            {'language': 'en', 'next': '/'},
            follow=False
        )
        
        # Verify redirect
        self.assertEqual(response.status_code, 302)
        
        # Verify cookie was set
        cookie = self.client.cookies.get(settings.LANGUAGE_COOKIE_NAME)
        self.assertIsNotNone(cookie, "Language cookie should be set")
        self.assertEqual(cookie.value, 'en', "Language cookie should be 'en'")

    def test_language_default_is_french(self):
        """
        Test that a new session defaults to French on root URL.
        """
        # Clear cookies to simulate new session
        self.client.cookies.clear()
        response = self.client.get('/')
        self.assertEqual(
            response.headers.get('Content-Language'), 'fr', 
            "Default language should be 'fr'"
        )
        
    def test_language_switch_to_english_via_url(self):
        """
        Test that visiting /en/ prefix sets language to English.
        """
        response = self.client.get('/en/', follow=True)
        session = self.client.session
        self.assertEqual(session.get('_language'), 'en', "Visiting /en/ should set session to English")

    def test_english_url_prefix_returns_english_content(self):
        """
        Test that URLs with /en/ prefix return English content.
        """
        response = self.client.get('/en/')
        self.assertEqual(
            response.headers.get('Content-Language'), 'en',
            "English URL should return English content"
        )


