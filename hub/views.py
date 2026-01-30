from django.views.generic import TemplateView
from django.utils.translation import get_language, check_for_language
from django.shortcuts import redirect
from django.views.decorators.http import require_POST
from django.conf import settings
from django.http import HttpResponseRedirect
import logging

logger = logging.getLogger(__name__)

@require_POST
def switch_language(request):
    """
    Custom view to switch language and update session explicitly.
    This replaces the standard set_language to ensure session persistence works with our custom middleware.
    """
    language = request.POST.get('language')
    next_url = request.POST.get('next', '/')
    
    if language and check_for_language(language):
        if hasattr(request, 'session'):
            request.session['_language'] = language
            request.session.save() # Explicitly save
            logger.info(f"Language switched to {language} (Session updated)")
        
        # Rewrite URL to new language
        from django.urls import translate_url
        if next_url:
            translated_url = translate_url(next_url, language)
            if translated_url:
                next_url = translated_url

        # Also set cookie for redundancy
        response = HttpResponseRedirect(next_url)
        response.set_cookie(
            settings.LANGUAGE_COOKIE_NAME,
            language,
            max_age=settings.LANGUAGE_COOKIE_AGE,
            samesite=getattr(settings, 'LANGUAGE_COOKIE_SAMESITE', 'Lax'),
            httponly=getattr(settings, 'LANGUAGE_COOKIE_HTTPONLY', False),
            secure=request.is_secure(),
        )
        return response
            
    return HttpResponseRedirect(next_url)


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
        context['page_title'] = 'KrisPC'
        context['tagline'] = (
            'Services et Outils Professionnels' if is_french
            else 'Professional Services & Tools'
        )

        # Build subdomain URLs with language prefix
        lang_path = '' if is_french else '/en'
        
        context['apps'] = [
            {
                'name': 'KrisPC',
                'icon': '🖥️',
                'description': (
                    'Réparations informatiques professionnelles' if is_french
                    else 'Professional computer repairs'
                ),
                'url': f'https://com.krispc.fr{lang_path}/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Pdf2Cal',
                'icon': '📅',
                'description': (
                    'Convertissez vos PDF en calendriers' if is_french
                    else 'Convert your PDFs to calendars'
                ),
                'url': f'https://p2c.krispc.fr{lang_path}/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Plexus',
                'icon': '🪞',
                'description': (
                    'Système de déchargement cognitif' if is_french
                    else 'Cognitive offloading system'
                ),
                'url': f'https://plexus.krispc.fr{lang_path}/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Emoty',
                'icon': '🎨',
                'description': (
                    'Créateur de motifs Emoji' if is_french
                    else 'Emoji Pattern Creator'
                ),
                'url': 'https://emo.krispc.fr/',
                'button_text': 'Accéder' if is_french else 'Visit',
            }
        ]

        user = getattr(self.request, 'user', None)
        context['is_authenticated'] = user.is_authenticated if user else False
        
        if user and user.is_staff:
            context['admin_apps'] = [
                {
                    'name': 'Admin Panel',
                    'icon': '⚙️',
                    'description': 'Django Administration',
                    'url': '/admin/',
                    'button_text': 'Manage',
                },
                {
                    'name': 'Analytics',
                    'icon': '📊',
                    'description': 'Traffic & Performance',
                    'url': '/analytics/dashboard/',
                    'button_text': 'View',
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
