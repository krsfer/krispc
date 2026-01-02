from django.utils.translation import activate


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

        # Set language in session to maintain across requests
        # Only set if not already set or if different from current
        session_lang = request.session.get('_language')
        if session_lang != language:
            request.session['_language'] = language

        # Also activate it for this request
        activate(language)

        response = self.get_response(request)
        return response
