from django.utils.translation import activate
from django.conf import settings
from django.http import HttpResponseRedirect
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
        # We check for '/i18n/' anywhere in path to handle prefixed URLs like /en/i18n/
        # Also skip our custom switch_language view
        if request.path.startswith('/api/') or '/i18n/' in request.path or 'switch-lang' in request.path:
            return self.get_response(request)

        # Determine language from URL path
        path = request.path
        
        # Check if an explicit language is requested via URL
        if request.GET.get('lang'):
             # Explicit override via query param (e.g. ?lang=fr)
             language = request.GET.get('lang')
             if language in ['fr', 'en']:
                request.session['_language'] = language
                request.session.modified = True
             else:
                 # Fallback for invalid lang codes
                 language = request.session.get('_language', 'fr')
        elif path.startswith('/en/'):
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

        # Redirect logic: If English (non-default) is active but URL lacks prefix, redirect!
        should_redirect = False
        redirect_path = path

        if language == 'en' and not request.path.startswith('/en/'):
             should_redirect = True
             redirect_path = f'/en{request.path}'
        elif language == 'fr' and request.path.startswith('/en/'):
             should_redirect = True
             # /en/foo -> /foo
             redirect_path = request.path[3:]
             if not redirect_path.startswith('/'):
                 redirect_path = '/' + redirect_path

        if should_redirect:
             if request.META.get('QUERY_STRING'):
                  redirect_path += f"?{request.META['QUERY_STRING']}"
             response = HttpResponseRedirect(redirect_path)
        else:
             response = self.get_response(request)

        # Set language cookie for persistence across browser sessions
        response.set_cookie(
            settings.LANGUAGE_COOKIE_NAME,
            language,
            max_age=settings.LANGUAGE_COOKIE_AGE,
            samesite=getattr(settings, 'LANGUAGE_COOKIE_SAMESITE', 'Lax'),
            httponly=getattr(settings, 'LANGUAGE_COOKIE_HTTPONLY', False),
            secure=request.is_secure(),
        )

        return response