from django.views.generic import TemplateView
from django.utils.translation import get_language, check_for_language
from django.shortcuts import redirect
from django.views.decorators.http import require_POST
from django.conf import settings
from django.http import HttpResponseRedirect
import logging

logger = logging.getLogger(__name__)

from django.views.decorators.csrf import csrf_exempt
from krispc.context_processors import resolve_base_url

@csrf_exempt
@require_POST
def switch_language(request):
    """
    Custom view to switch language and update session explicitly.
    This replaces the standard set_language to ensure session persistence works with our custom middleware.
    """
    from urllib.parse import urlparse
    language = request.POST.get('language')
    next_url = request.POST.get('next', '/')
    
    if language and check_for_language(language):
        if hasattr(request, 'session'):
            request.session['_language'] = language
            request.session.save() # Explicitly save
            logger.info(f"Language switched to {language} (Session updated)")
        
        # Rewrite URL to new language
        # Normalize: strip scheme/host and drop leading language prefix
        parsed = urlparse(next_url)
        path = parsed.path or "/"
        
        # Remove existing language prefix if present
        lang_codes = [code for code, _ in settings.LANGUAGES]
        parts = path.lstrip("/").split("/", 1)
        if parts and parts[0] in lang_codes:
            path = "/" + (parts[1] if len(parts) > 1 else "")
        if not path:
            path = "/"
            
        # Reattach query string if present
        if parsed.query:
            path = f"{path}?{parsed.query}"

        # If target language is not default, prepend it
        # We use settings.LANGUAGE_CODE as the default (prefix-less) language
        if language != settings.LANGUAGE_CODE:
            # Ensure we don't double slash
            if path == "/":
                next_url = f"/{language}/"
            else:
                next_url = f"/{language}{path}"
        else:
            next_url = path

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

        hub_base_url = resolve_base_url(self.request, settings.HUB_BASE_URL, "hub")
        krispc_base_url = resolve_base_url(self.request, settings.KRISPC_BASE_URL, "com")
        p2c_base_url = resolve_base_url(self.request, settings.P2C_BASE_URL, "p2c")
        plexus_base_url = resolve_base_url(self.request, settings.PLEXUS_BASE_URL, "plexus")
        emo_base_url = resolve_base_url(self.request, settings.EMO_BASE_URL, "emo")
        
        context['apps'] = [
            {
                'name': 'KrisPC',
                'icon_name': 'monitor',
                'description': (
                    'Réparations informatiques professionnelles' if is_french
                    else 'Professional computer repairs'
                ),
                'url': f'{krispc_base_url}{lang_path}/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Pdf2Cal',
                'icon_name': 'calendar',
                'description': (
                    'Convertissez vos PDF en calendriers' if is_french
                    else 'Convert your PDFs to calendars'
                ),
                'url': f'{p2c_base_url}{lang_path}/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Plexus',
                'icon_name': 'layers',
                'description': (
                    'Système de déchargement cognitif' if is_french
                    else 'Cognitive offloading system'
                ),
                'url': f'{plexus_base_url}{lang_path}/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Emoty',
                'icon_name': 'sparkles',
                'description': (
                    'Créateur de motifs Emoji' if is_french
                    else 'Emoji Pattern Creator'
                ),
                'url': f'{emo_base_url}/',
                'button_text': 'Accéder' if is_french else 'Visit',
            }
        ]

        user = getattr(self.request, 'user', None)
        context['is_authenticated'] = user.is_authenticated if user else False
        
        if user and user.is_staff:
            context['admin_apps'] = [
                {
                    'name': 'Admin Panel',
                    'icon_name': 'sliders',
                    'description': 'Django Administration',
                    'url': '/admin/',
                    'button_text': 'Manage',
                },
                {
                    'name': 'Analytics',
                    'icon_name': 'bar-chart',
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


class DeveloperIndexView(TemplateView):
    """Landing page for developer resources at the Hub level."""
    template_name = "hub/developers.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get current language (set by middleware)
        current_lang = get_language()
        context['current_language'] = current_lang[:2]
        return context
