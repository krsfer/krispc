from django.views.generic import TemplateView
from django.utils.translation import get_language


class IndexView(TemplateView):
    template_name = "hub/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Get current language (set by middleware)
        current_lang = get_language()
        is_french = current_lang.startswith('fr')

        # Build language-aware URLs (prefix_default_language=False means no prefix for French)
        lang_prefix = '' if is_french else f'/{current_lang[:2]}'

        # Explicitly pass language to template
        context['current_language'] = current_lang[:2]
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
                'url': f'{lang_prefix}/krispc/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Pdf2Cal',
                'icon': '📅',
                'description': (
                    'Convertissez vos PDF en calendriers' if is_french
                    else 'Convert your PDFs to calendars'
                ),
                'url': f'{lang_prefix}/importpdf/',
                'button_text': 'Accéder' if is_french else 'Visit',
            }
        ]

        return context


class PrivacyView(TemplateView):
    template_name = "hub/privacy.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get current language (set by middleware)
        current_lang = get_language()
        context['current_language'] = current_lang[:2]
        return context


class TermsView(TemplateView):
    template_name = "hub/terms.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get current language (set by middleware)
        current_lang = get_language()
        context['current_language'] = current_lang[:2]
        return context
