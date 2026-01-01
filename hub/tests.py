from django.test import TestCase, RequestFactory
from django.utils.translation import activate
from .views import IndexView


class IndexViewTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_index_view_context_french(self):
        activate('fr')
        request = self.factory.get('/')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['page_title'], 'Christopher')
        self.assertEqual(context['tagline'], 'Services et Outils Professionnels')
        self.assertEqual(len(context['apps']), 2)
        self.assertEqual(context['apps'][0]['name'], 'KrisPC')
        self.assertEqual(context['apps'][1]['name'], 'Pdf2Cal')

    def test_index_view_context_english(self):
        activate('en')
        request = self.factory.get('/')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['tagline'], 'Professional Services & Tools')
        self.assertEqual(context['apps'][0]['button_text'], 'Visit')
