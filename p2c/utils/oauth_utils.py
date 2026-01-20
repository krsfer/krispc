"""Utility functions for OAuth operations."""

from django.conf import settings


def get_oauth_scopes_string():
    """
    Get the OAuth scopes as a space-separated string for OAuth requests.

    Returns:
        str: Space-separated string of OAuth scopes
    """
    return " ".join(settings.GOOGLE_OAUTH2_SCOPES)
