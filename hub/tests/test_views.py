from django.test import TestCase, RequestFactory
from django.test.utils import override_settings
from django.urls import reverse, resolve
from django.utils.translation import activate
from hub.views import IndexView, PrivacyView, TermsView


class IndexViewTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_index_view_context_french(self):
        activate('fr')
        request = self.factory.get('/')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['page_title'], 'KrisPC')
        self.assertEqual(context['tagline'], 'Services et Outils Professionnels')
        self.assertEqual(len(context['apps']), 4)
        self.assertEqual(context['apps'][0]['name'], 'KrisPC')
        self.assertEqual(context['apps'][1]['name'], 'Pdf2Cal')
        self.assertEqual(context['apps'][2]['name'], 'Plexus')
        self.assertEqual(context['apps'][3]['name'], 'Emoty')

    def test_index_view_context_english(self):
        activate('en')
        request = self.factory.get('/')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['tagline'], 'Professional Services & Tools')
        self.assertEqual(context['apps'][0]['button_text'], 'Visit')

    @override_settings(ALLOWED_HOSTS=[".localhost", "testserver"])
    def test_index_view_context_localhost_uses_localhost_urls(self):
        activate('en')
        request = self.factory.get('/', HTTP_HOST='hub.localhost:8000')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['apps'][0]['url'], 'http://com.localhost:8000/en/')
        self.assertEqual(context['apps'][1]['url'], 'http://p2c.localhost:8000/en/')
        self.assertEqual(context['apps'][2]['url'], 'http://plexus.localhost:8000/en/')
        self.assertEqual(context['apps'][3]['url'], 'http://emo.localhost:8000/')

    def test_index_page_renders_featured_krispc_card(self):
        response = self.client.get('/en/')

        self.assertContains(response, 'data-featured-card="true"', count=1)
        self.assertContains(response, 'Most Popular')

class HubURLTests(TestCase):
    def test_index_url_resolves(self):
        url = reverse('hub:index')
        # URL may have language prefix (e.g., /en/) due to i18n
        self.assertTrue(url == '/' or url.endswith('/'), f"URL should be root: {url}")
        self.assertEqual(resolve(url).func.view_class, IndexView)

    def test_privacy_url_resolves(self):
        url = reverse('hub:privacy')
        # URL may have language prefix (e.g., /en/privacy/) due to i18n
        self.assertTrue(url.endswith('/privacy/'), f"URL should end with /privacy/: {url}")
        self.assertEqual(resolve(url).func.view_class, PrivacyView)

    def test_terms_url_resolves(self):
        url = reverse('hub:terms')
        # URL may have language prefix (e.g., /en/terms/) due to i18n
        self.assertTrue(url.endswith('/terms/'), f"URL should end with /terms/: {url}")
        self.assertEqual(resolve(url).func.view_class, TermsView)
