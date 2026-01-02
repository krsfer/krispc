from django.views.generic import TemplateView
from django.utils.translation import get_language, activate
from django.utils import translation


class IndexView(TemplateView):
    template_name = "hub/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Determine language from URL path
        # No language prefix = French (default), /en/ prefix = English
        path = self.request.path
        if path.startswith('/en/'):
            current_lang = 'en'
        else:
            # No prefix means French (default language with prefix_default_language=False)
            current_lang = 'fr'

        # Explicitly activate this language for the request
        activate(current_lang)

        # Also set in session to maintain across requests
        self.request.session[translation.LANGUAGE_SESSION_KEY] = current_lang

        is_french = current_lang == 'fr'

        # Build language-aware URLs (prefix_default_language=False means no prefix for French)
        lang_prefix = '' if is_french else f'/{current_lang}'

        # Explicitly pass language to template
        context['current_language'] = current_lang
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

        # Determine language from URL path
        path = self.request.path
        if path.startswith('/en/'):
            current_lang = 'en'
        else:
            current_lang = 'fr'

        # Explicitly activate and set in session
        activate(current_lang)
        self.request.session[translation.LANGUAGE_SESSION_KEY] = current_lang

        context['current_language'] = current_lang
        return context


class TermsView(TemplateView):
    template_name = "hub/terms.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Determine language from URL path
        path = self.request.path
        if path.startswith('/en/'):
            current_lang = 'en'
        else:
            current_lang = 'fr'

        # Explicitly activate and set in session
        activate(current_lang)
        self.request.session[translation.LANGUAGE_SESSION_KEY] = current_lang

        context['current_language'] = current_lang
        return context
