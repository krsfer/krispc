from django.test import TestCase, RequestFactory, override_settings
from _main.subdomain_middleware import SubdomainRoutingMiddleware
from django.http import HttpResponse

@override_settings(ALLOWED_HOSTS=['*'])
class ProductionSubdomainTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.get_response = lambda req: HttpResponse("ok")
        self.middleware = SubdomainRoutingMiddleware(self.get_response)

    def test_base_domain_calculation_two_parts(self):
        """
        Test that host 'krispc.fr' is correctly handled.
        Current bug: base_domain becomes 'fr' instead of 'krispc.fr'.
        """
        # Simulate a request to krispc.fr/plexus/
        request = self.factory.get('/plexus/', HTTP_HOST='krispc.fr')
        response = self.middleware(request)
        
        # In the bug scenario, it redirects to plexus.fr
        # We want it to redirect to plexus.krispc.fr
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response['Location'], 'http://plexus.krispc.fr/')

    def test_base_domain_calculation_three_parts(self):
        """
        Test that host 'www.krispc.fr' is correctly handled.
        """
        request = self.factory.get('/plexus/', HTTP_HOST='www.krispc.fr')
        response = self.middleware(request)
        
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response['Location'], 'http://plexus.krispc.fr/')

    def test_no_redirect_if_already_on_subdomain(self):
        """
        Test that host 'plexus.krispc.fr' does not redirect for /plexus/ path.
        """
        request = self.factory.get('/plexus/', HTTP_HOST='plexus.krispc.fr')
        response = self.middleware(request)
        
        # Should not redirect, just return the response from get_response
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"ok")
