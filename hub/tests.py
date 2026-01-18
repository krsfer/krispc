from django.test import TestCase, RequestFactory
from django.urls import reverse, resolve
from django.utils.translation import activate
from .views import IndexView, PrivacyView, TermsView


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
        self.assertEqual(url, '/')
        self.assertEqual(resolve(url).func.view_class, IndexView)

    def test_privacy_url_resolves(self):
        url = reverse('hub:privacy')
        self.assertEqual(url, '/privacy/')
        self.assertEqual(resolve(url).func.view_class, PrivacyView)

    def test_terms_url_resolves(self):
        url = reverse('hub:terms')
        self.assertEqual(url, '/terms/')
        self.assertEqual(resolve(url).func.view_class, TermsView)
