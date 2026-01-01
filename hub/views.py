from django.views.generic import TemplateView
from django.utils.translation import get_language


class IndexView(TemplateView):
    template_name = "hub/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        is_french = get_language() == 'fr'

        context['page_title'] = 'Christopher'
        context['tagline'] = (
            'Services et Outils Professionnels' if is_french
            else 'Professional Services & Tools'
        )

        context['apps'] = [
            {
                'name': 'KrisPC',
                'icon': '🖥️',
                'description': (
                    'Réparations informatiques professionnelles' if is_french
                    else 'Professional computer repairs'
                ),
                'url': '/krispc/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Pdf2Cal',
                'icon': '📅',
                'description': (
                    'Convertissez vos PDF en calendriers' if is_french
                    else 'Convert your PDFs to calendars'
                ),
                'url': '/importpdf/',
                'button_text': 'Accéder' if is_french else 'Visit',
            }
        ]

        return context


class PrivacyView(TemplateView):
    template_name = "hub/privacy.html"


class TermsView(TemplateView):
    template_name = "hub/terms.html"
