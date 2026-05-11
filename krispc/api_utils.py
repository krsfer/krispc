"""
Cross-app API response helpers.

The DRF default Response shape is just the serializer output. These helpers
wrap it in a consistent envelope so clients can rely on a uniform
{success, data, errors, message} structure without per-view boilerplate.
Pairs with the custom_exception_handler in krispc/exceptions.py — error
responses already match this envelope; this module provides the success-path
helpers.

Usage:
    from krispc.api_utils import success_response, created_response, no_content_response

    return success_response(serializer.data, message="Contacts retrieved.")
    return created_response(serializer.data, message="Contact created.")
    return no_content_response()
"""
from rest_framework import status
from rest_framework.response import Response


def success_response(data=None, message=None, status_code=status.HTTP_200_OK, **extra):
    """Wrap a successful payload in the standard envelope.

    Args:
        data: The serialized payload (dict, list, or None).
        message: Optional human-readable message.
        status_code: HTTP status code (default: 200).
        **extra: Additional top-level keys (e.g. pagination metadata).
    """
    body = {"success": True, "data": data}
    if message is not None:
        body["message"] = message
    body.update(extra)
    return Response(body, status=status_code)


def created_response(data=None, message=None, **extra):
    """201 Created — convenience wrapper around success_response."""
    return success_response(data, message=message, status_code=status.HTTP_201_CREATED, **extra)


def no_content_response():
    """204 No Content — for successful DELETE / void mutations.

    By HTTP spec the body MUST be empty; no envelope is returned.
    """
    return Response(status=status.HTTP_204_NO_CONTENT)


def error_response(message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Manually-constructed error response in the same envelope as
    custom_exception_handler. Prefer raising a DRF exception (which the
    handler will format); reach for this only when you need to short-circuit
    with an error without raising.
    """
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    return Response(body, status=status_code)
