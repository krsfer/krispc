from django.test import TestCase, RequestFactory
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
        self.assertEqual(len(context['apps']), 3)
        self.assertEqual(context['apps'][0]['name'], 'KrisPC')
        self.assertEqual(context['apps'][1]['name'], 'Pdf2Cal')
        self.assertEqual(context['apps'][2]['name'], 'Plexus')

    def test_index_view_context_english(self):
        activate('en')
        request = self.factory.get('/')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['tagline'], 'Professional Services & Tools')
        self.assertEqual(context['apps'][0]['button_text'], 'Visit')


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

