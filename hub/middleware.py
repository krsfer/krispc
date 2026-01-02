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
        # Determine language from URL path
        # No /en/ prefix = French (default)
        # /en/ prefix = English
        path = request.path

        if path.startswith('/en/'):
            language = 'en'
        else:
            # No prefix means French (default language with prefix_default_language=False)
            language = 'fr'

        # Log what we're setting
        logger.info(f"EnsureDefaultLanguageMiddleware: path={path}, setting language={language}, session_before={request.session.get('_language', 'NOT_SET')}")

        # Set language in session
        # LocaleMiddleware will pick this up and activate it
        request.session['_language'] = language
        # Mark session as modified to ensure it's saved
        request.session.modified = True

        logger.info(f"EnsureDefaultLanguageMiddleware: session_after={request.session.get('_language')}")

        response = self.get_response(request)
        return response
