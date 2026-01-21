from django.utils.translation import activate
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class EnsureDefaultLanguageMiddleware:
    """
    Middleware to ensure French is used when no language prefix is in the URL.

    With prefix_default_language=False:
    - URLs without /en/ prefix should use French (default)
    - URLs with /en/ prefix should use English

    This middleware sets the language in the session before LocaleMiddleware
    processes it, ensuring consistent language across app navigation.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip API paths and i18n paths - let LocaleMiddleware handle them
        if request.path.startswith('/api/') or request.path.startswith('/i18n/'):
            return self.get_response(request)

        # Determine language from URL path
        path = request.path
        
        # Check if an explicit language is requested via URL
        if path.startswith('/en/'):
            language = 'en'
            # Force update session if explicit in URL
            request.session['_language'] = language
            request.session.modified = True
        elif path.startswith('/fr/'):
             language = 'fr'
             # Force update session if explicit in URL
             request.session['_language'] = language
             request.session.modified = True
        else:
            # No prefix. Check if session has a preference.
            session_language = request.session.get('_language')
            
            # Check cookie if session is empty
            cookie_language = request.COOKIES.get(settings.LANGUAGE_COOKIE_NAME)
            
            if session_language:
                language = session_language
            elif cookie_language:
                language = cookie_language
                # Sync session with cookie
                request.session['_language'] = language
                request.session.modified = True
            else:
                # No preference? Default to French.
                request.session['_language'] = 'fr'
                request.session.modified = True
                language = 'fr'
        
        # Explicitly activate the language for this request thread
        activate(language)

        response = self.get_response(request)
        return response