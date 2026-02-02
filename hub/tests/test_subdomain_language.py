from django.test import TestCase, Client, override_settings
from django.conf import settings

@override_settings(ALLOWED_HOSTS=['*'])
class SubdomainLanguageSwitchTests(TestCase):
    """Test switching language from a subdomain."""

    def setUp(self):
        self.client = Client()

    def test_switch_language_from_plexus_subdomain(self):
        """
        Test that posting to /hub/switch-lang/ from plexus.krispc.fr 
        properly switches language without a 405 error by using 307.
        """
        response = self.client.post(
            '/hub/switch-lang/', 
            {'language': 'en', 'next': '/'},
            HTTP_HOST='plexus.krispc.fr'
        )
        
        # Now it should return 307 (Temporary Redirect)
        self.assertEqual(response.status_code, 307)
        self.assertIn('hub.krispc.fr/switch-lang/', response['Location'])
        
        # If we follow that redirect with a POST (preserving data):
        # The Django Client doesn't automatically preserve POST data on 307 follow,
        # so we simulate the subsequent POST to the hub.
        response_follow = self.client.post(
            response['Location'],
            {'language': 'en', 'next': '/'},
            HTTP_HOST='hub.krispc.fr'
        )
        
        # This should now return 302 (standard switch_language redirect)
        self.assertEqual(response_follow.status_code, 302)
        # And the cookie should be set to 'en'
        self.assertEqual(response_follow.cookies[settings.LANGUAGE_COOKIE_NAME].value, 'en')
