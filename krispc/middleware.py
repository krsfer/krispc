"""
Custom middleware for the KrisPC API.

Provides enhanced language detection and request processing for API endpoints.
"""
import logging
from django.utils import translation

logger = logging.getLogger(__name__)


class APILanguageMiddleware:
    """
    Middleware to automatically detect and activate language for API requests.
    
    This middleware:
    - Parses the Accept-Language header
    - Activates the appropriate language for the request
    - Ensures language is deactivated after the request
    - Only applies to API endpoints (paths starting with /api/)
    """
    
    SUPPORTED_LANGUAGES = ['en', 'fr']
    
    def __init__(self, get_response):
        """
        Initialize the middleware.
        
        Args:
            get_response: The next middleware or view in the chain
        """
        self.get_response = get_response
        
    def __call__(self, request):
        """
        Process the request and activate the appropriate language.
        
        Args:
            request: The HTTP request object
            
        Returns:
            HttpResponse: The response from the view or next middleware
        """
        lang_code = None
        
        # Only apply to API endpoints
        if request.path.startswith('/api/'):
            lang_code = self._get_language_from_request(request)
            
            if lang_code:
                translation.activate(lang_code)
                request.LANGUAGE_CODE = lang_code
                logger.debug(f"API request language set to: {lang_code}")
        
        response = self.get_response(request)
        
        # Set Content-Language header to match the activated language
        if request.path.startswith('/api/') and lang_code:
            response['Content-Language'] = lang_code
        
        # Deactivate translation after request
        if request.path.startswith('/api/'):
            translation.deactivate()
        
        return response
    
    def _get_language_from_request(self, request):
        """
        Extract and validate language code from the request.
        
        Checks in order:
        1. Accept-Language header
        2. Query parameter 'lang'
        3. Default to None (Django's default will be used)
        
        Args:
            request: The HTTP request object
            
        Returns:
            str or None: A valid language code or None
        """
        # Check query parameter first (allows explicit override)
        lang = request.GET.get('lang', '').lower()
        if lang in self.SUPPORTED_LANGUAGES:
            return lang
        
        # Parse Accept-Language header
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        
        if accept_language:
            # Parse: "en-US,en;q=0.9,fr;q=0.8" -> ["en-US", "en;q=0.9", "fr;q=0.8"]
            languages = accept_language.split(',')
            
            for lang_entry in languages:
                # Extract language code (first 2 chars before - or ;)
                lang_code = lang_entry.split(';')[0].split('-')[0].strip().lower()
                
                if lang_code in self.SUPPORTED_LANGUAGES:
                    return lang_code
        
        return None


class APIRequestLoggingMiddleware:
    """
    Middleware to log API requests for monitoring and debugging.
    
    Logs:
    - Request method and path
    - User information (if authenticated)
    - Response status code
    - Request duration
    """
    
    def __init__(self, get_response):
        """
        Initialize the middleware.
        
        Args:
            get_response: The next middleware or view in the chain
        """
        self.get_response = get_response
        
    def __call__(self, request):
        """
        Process the request and log relevant information.
        
        Args:
            request: The HTTP request object
            
        Returns:
            HttpResponse: The response from the view or next middleware
        """
        # Only log API requests
        if not request.path.startswith('/api/'):
            return self.get_response(request)
        
        # Log request
        user_info = 'anonymous'
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info = f"user:{request.user.username}"
        
        logger.info(f"API Request: {request.method} {request.path} [{user_info}]")
        
        # Process request
        response = self.get_response(request)
        
        # Log response
        logger.info(
            f"API Response: {request.method} {request.path} "
            f"[{user_info}] -> {response.status_code}"
        )
        
        return response
