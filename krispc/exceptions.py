"""
Custom exception handlers for the KrisPC API.

Provides standardized error responses for all API errors.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that formats all API errors consistently.
    
    Returns a standardized error response with:
    - success: False
    - errors: Detailed error information
    - message: Human-readable error message
    - status_code: HTTP status code
    
    Args:
        exc: The exception instance
        context: The context in which the exception occurred
        
    Returns:
        Response object with standardized error format
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log the error
        view = context.get('view', None)
        request = context.get('request', None)
        
        log_message = f"API Error: {exc.__class__.__name__} - {str(exc)}"
        if view:
            log_message += f" in {view.__class__.__name__}"
        if request:
            log_message += f" - {request.method} {request.path}"
            
        logger.warning(log_message)
        
        # Standardize the response format
        error_data = {
            'success': False,
            'errors': response.data,
            'message': get_error_message(exc, response),
            'status_code': response.status_code
        }
        
        return Response(error_data, status=response.status_code)
    
    # For unexpected errors not caught by DRF
    logger.error(f"Unhandled API Exception: {exc}", exc_info=True)
    
    return Response({
        'success': False,
        'errors': {'detail': 'An unexpected error occurred.'},
        'message': 'Internal server error',
        'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_error_message(exc, response):
    """
    Extract a user-friendly error message from the exception.
    
    Args:
        exc: The exception instance
        response: The Response object from the default handler
        
    Returns:
        str: A user-friendly error message
    """
    # Try to get error message from the exception
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, dict):
            # Get the first error message
            for key, value in exc.detail.items():
                if isinstance(value, list):
                    return f"{key}: {value[0]}"
                return f"{key}: {value}"
        return str(exc.detail)
    
    # Fallback to status code descriptions
    status_messages = {
        400: 'Bad request. Please check your input.',
        401: 'Authentication required.',
        403: 'You do not have permission to perform this action.',
        404: 'The requested resource was not found.',
        405: 'Method not allowed.',
        429: 'Too many requests. Please try again later.',
        500: 'Internal server error.',
        503: 'Service temporarily unavailable.',
    }
    
    return status_messages.get(response.status_code, 'An error occurred.')
