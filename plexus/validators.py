"""
Input validation limits and validators for Plexus.

Provides reusable validation for text content, images, audio inputs,
and security validation against prompt injection attacks.
"""
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.core.validators import BaseValidator
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# INPUT LIMITS CONFIGURATION
# =============================================================================

INPUT_LIMITS = {
    # Text content limits (characters)
    'TEXT_MIN_LENGTH': 1,
    'TEXT_MAX_LENGTH': 10000,
    
    # Image file size limits (bytes)
    'IMAGE_MAX_SIZE': 5 * 1024 * 1024,  # 5 MB
    
    # Audio limits
    'AUDIO_MIN_DURATION': 1,    # seconds
    'AUDIO_MAX_DURATION': 120,  # seconds (2 minutes)
    'AUDIO_MAX_SIZE': 10 * 1024 * 1024,  # 10 MB
    
    # Security settings
    'MAX_INJECTION_RISK_SCORE': 0.7,  # Block inputs with risk score above this
}


# =============================================================================
# FILE SIZE VALIDATOR
# =============================================================================

class MaxFileSizeValidator(BaseValidator):
    """
    Validator to check that a file doesn't exceed a maximum size.
    
    Usage:
        validators=[MaxFileSizeValidator(5 * 1024 * 1024)]  # 5 MB
    """
    message = _('File size must be no more than %(limit_value)s bytes. Current size: %(show_value)s bytes.')
    code = 'max_file_size'

    def compare(self, file_size, max_size):
        return file_size > max_size

    def clean(self, file):
        if hasattr(file, 'size'):
            return file.size
        return 0


# =============================================================================
# TEXT VALIDATION
# =============================================================================

def validate_text_length(content, min_length=None, max_length=None):
    """
    Validate text content length.
    
    Args:
        content: The text content to validate
        min_length: Minimum length (default from INPUT_LIMITS)
        max_length: Maximum length (default from INPUT_LIMITS)
        
    Raises:
        ValidationError: If content length is outside allowed range
    """
    if min_length is None:
        min_length = INPUT_LIMITS['TEXT_MIN_LENGTH']
    if max_length is None:
        max_length = INPUT_LIMITS['TEXT_MAX_LENGTH']
    
    if content is None:
        content = ''
    
    content_length = len(content)
    
    if content_length < min_length:
        raise ValidationError(
            _('Content must be at least %(min)d character(s). Current: %(current)d.'),
            code='text_too_short',
            params={'min': min_length, 'current': content_length}
        )
    
    if content_length > max_length:
        raise ValidationError(
            _('Content must be at most %(max)d characters. Current: %(current)d.'),
            code='text_too_long',
            params={'max': max_length, 'current': content_length}
        )


# =============================================================================
# IMAGE VALIDATION
# =============================================================================

def validate_image_size(image_file, max_size=None):
    """
    Validate image file size.
    
    Args:
        image_file: The uploaded image file
        max_size: Maximum size in bytes (default from INPUT_LIMITS)
        
    Raises:
        ValidationError: If image exceeds maximum size
    """
    if max_size is None:
        max_size = INPUT_LIMITS['IMAGE_MAX_SIZE']
    
    if image_file is None:
        return
    
    file_size = getattr(image_file, 'size', 0)
    
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        current_mb = file_size / (1024 * 1024)
        raise ValidationError(
            _('Image file is too large. Maximum size: %(max).1f MB. Current: %(current).1f MB.'),
            code='image_too_large',
            params={'max': max_mb, 'current': current_mb}
        )


# =============================================================================
# AUDIO VALIDATION
# =============================================================================

def validate_audio_file(audio_file, max_size=None):
    """
    Validate audio file size.
    
    Args:
        audio_file: The uploaded audio file
        max_size: Maximum size in bytes (default from INPUT_LIMITS)
        
    Raises:
        ValidationError: If audio file exceeds maximum size
    """
    if max_size is None:
        max_size = INPUT_LIMITS['AUDIO_MAX_SIZE']
    
    if audio_file is None:
        return
    
    file_size = getattr(audio_file, 'size', 0)
    
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        current_mb = file_size / (1024 * 1024)
        raise ValidationError(
            _('Audio file is too large. Maximum size: %(max).1f MB. Current: %(current).1f MB.'),
            code='audio_too_large',
            params={'max': max_mb, 'current': current_mb}
        )


def validate_audio_duration(audio_file, min_duration=None, max_duration=None):
    """
    Validate audio duration using file size as a proxy.
    
    Assumes approximately 100 KB per 10 seconds for WebM audio.
    For precise validation, use pydub or mutagen library.
    
    Args:
        audio_file: The uploaded audio file
        min_duration: Minimum duration in seconds (default from INPUT_LIMITS)
        max_duration: Maximum duration in seconds (default from INPUT_LIMITS)
        
    Raises:
        ValidationError: If audio duration is outside allowed range
    """
    if min_duration is None:
        min_duration = INPUT_LIMITS['AUDIO_MIN_DURATION']
    if max_duration is None:
        max_duration = INPUT_LIMITS['AUDIO_MAX_DURATION']
    
    if audio_file is None:
        return
    
    file_size = getattr(audio_file, 'size', 0)
    
    # Estimate duration: ~10 KB per second for compressed WebM audio
    # This is a rough estimate; adjust based on actual encoding settings
    BYTES_PER_SECOND = 10 * 1024  # 10 KB/s
    estimated_duration = file_size / BYTES_PER_SECOND
    
    if estimated_duration < min_duration:
        raise ValidationError(
            _('Audio is too short. Minimum duration: %(min)d second(s).'),
            code='audio_too_short',
            params={'min': min_duration}
        )
    
    if estimated_duration > max_duration:
        raise ValidationError(
            _('Audio is too long. Maximum duration: %(max)d seconds (%(max_min)d minutes).'),
            code='audio_too_long',
            params={'max': max_duration, 'max_min': max_duration // 60}
        )


# =============================================================================
# COMBINED VALIDATOR FOR INPUT
# =============================================================================

def validate_input(content=None, image=None, audio=None, check_security=True):
    """
    Validate all input types at once.
    
    Args:
        content: Text content
        image: Image file
        audio: Audio file
        check_security: Whether to perform security validation (default True)
        
    Raises:
        ValidationError: If any validation fails
    """
    errors = {}
    
    # Validate text if provided (but allow empty if image/audio is provided)
    if content:
        try:
            validate_text_length(content)
        except ValidationError as e:
            errors['content'] = e.messages
        
        # Security validation
        if check_security:
            try:
                validate_content_security(content)
            except ValidationError as e:
                errors['security'] = e.messages
    
    # Validate image if provided
    if image:
        try:
            validate_image_size(image)
        except ValidationError as e:
            errors['image'] = e.messages
    
    # Validate audio if provided
    if audio:
        try:
            validate_audio_file(audio)
            validate_audio_duration(audio)
        except ValidationError as e:
            errors['audio'] = e.messages
    
    if errors:
        raise ValidationError(errors)


# =============================================================================
# SECURITY VALIDATION
# =============================================================================

def validate_content_security(content, max_risk_score=None, raise_on_detection=False):
    """
    Validate content for potential prompt injection patterns.
    
    This function detects suspicious patterns but does NOT block by default.
    It logs warnings for monitoring and only raises if explicitly configured.
    
    Args:
        content: Text content to validate
        max_risk_score: Maximum allowed risk score (default from INPUT_LIMITS)
        raise_on_detection: If True, raise ValidationError on high risk; if False, just log
        
    Raises:
        ValidationError: If raise_on_detection is True and risk score exceeds threshold
    """
    if not content:
        return
    
    if max_risk_score is None:
        max_risk_score = INPUT_LIMITS['MAX_INJECTION_RISK_SCORE']
    
    # Import here to avoid circular imports
    from plexus.services.prompt_security import (
        detect_injection_attempt,
        get_risk_score,
    )
    
    # Detect injection patterns
    is_suspicious, categories = detect_injection_attempt(content)
    
    if is_suspicious:
        risk_score = get_risk_score(content)
        
        logger.warning(
            "Security validation: Suspicious content detected. "
            "Categories: %s, Risk score: %.2f, Content preview: '%s...'",
            categories,
            risk_score,
            content[:50]
        )
        
        # Only raise if explicitly configured and risk is high
        if raise_on_detection and risk_score > max_risk_score:
            raise ValidationError(
                _('Content contains patterns that may indicate a security concern. '
                  'Please rephrase your input.'),
                code='security_risk',
                params={'risk_score': risk_score, 'categories': categories}
            )
    
    return is_suspicious

