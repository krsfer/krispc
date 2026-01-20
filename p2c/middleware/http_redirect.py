import logging

from django.conf import settings
from django.http import HttpResponseRedirect

logger = logging.getLogger(__name__)


class HTTPSToHTTPRedirectMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG:
            # Check if this is an HTTPS request
            if (
                request.is_secure()
                or request.META.get("HTTP_X_FORWARDED_PROTO") == "https"
            ):
                # Get the current URL
                url = request.build_absolute_uri()
                if url.startswith("https://"):
                    # Convert to HTTP
                    http_url = "http://" + url[8:]
                    logger.info(f"Redirecting HTTPS request to HTTP: {http_url}")
                    return HttpResponseRedirect(http_url)

        return self.get_response(request)
