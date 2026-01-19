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
        # Skip API paths - let LocaleMiddleware handle them via headers
        if request.path.startswith('/api/'):
            return self.get_response(request)

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
        current_session_lang = request.session.get('_language')
        logger.info(f"EnsureDefaultLanguageMiddleware: path={path}, setting language={language}, session_before={current_session_lang}")

        # Set language in session only if changed
        if current_session_lang != language:
            request.session['_language'] = language
            request.session.modified = True
            logger.info(f"EnsureDefaultLanguageMiddleware: session updated to {language}")
        else:
            logger.info("EnsureDefaultLanguageMiddleware: session already set, skipping update")

        response = self.get_response(request)
        return response
