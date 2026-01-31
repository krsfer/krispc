"""
Tests for input validation limits.

Tests the validators module for text, image, and audio validation.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import MagicMock

from plexus.validators import (
    INPUT_LIMITS,
    validate_text_length,
    validate_image_size,
    validate_audio_file,
    validate_audio_duration,
    validate_input,
    MaxFileSizeValidator,
)


class TextValidationTest(TestCase):
    """Tests for text content validation."""

    def test_valid_text_passes(self):
        """Normal text should pass validation."""
        validate_text_length("Hello, this is a valid thought.")
        # No exception means pass

    def test_empty_text_fails(self):
        """Empty text should fail validation."""
        with self.assertRaises(ValidationError) as ctx:
            validate_text_length("")
        self.assertEqual(ctx.exception.code, 'text_too_short')

    def test_none_text_fails(self):
        """None text should fail validation."""
        with self.assertRaises(ValidationError) as ctx:
            validate_text_length(None)
        self.assertEqual(ctx.exception.code, 'text_too_short')

    def test_max_length_text_passes(self):
        """Text at max length should pass."""
        max_text = "a" * INPUT_LIMITS['TEXT_MAX_LENGTH']
        validate_text_length(max_text)
        # No exception means pass

    def test_over_max_length_fails(self):
        """Text over max length should fail."""
        over_max_text = "a" * (INPUT_LIMITS['TEXT_MAX_LENGTH'] + 1)
        with self.assertRaises(ValidationError) as ctx:
            validate_text_length(over_max_text)
        self.assertEqual(ctx.exception.code, 'text_too_long')

    def test_custom_limits(self):
        """Custom min/max limits should work."""
        # Test with custom min
        with self.assertRaises(ValidationError):
            validate_text_length("ab", min_length=5)
        
        # Test with custom max
        with self.assertRaises(ValidationError):
            validate_text_length("123456", max_length=5)
        
        # Valid with custom limits
        validate_text_length("12345", min_length=3, max_length=10)


class ImageValidationTest(TestCase):
    """Tests for image file validation."""

    def test_valid_image_passes(self):
        """Small image should pass validation."""
        # Create a mock file under limit (1 MB)
        mock_file = MagicMock()
        mock_file.size = 1 * 1024 * 1024  # 1 MB
        validate_image_size(mock_file)
        # No exception means pass

    def test_image_at_limit_passes(self):
        """Image at exactly max size should pass."""
        mock_file = MagicMock()
        mock_file.size = INPUT_LIMITS['IMAGE_MAX_SIZE']
        validate_image_size(mock_file)
        # No exception means pass

    def test_image_over_limit_fails(self):
        """Image over max size should fail."""
        mock_file = MagicMock()
        mock_file.size = INPUT_LIMITS['IMAGE_MAX_SIZE'] + 1
        with self.assertRaises(ValidationError) as ctx:
            validate_image_size(mock_file)
        self.assertEqual(ctx.exception.code, 'image_too_large')

    def test_none_image_passes(self):
        """None image should pass (optional field)."""
        validate_image_size(None)
        # No exception means pass


class AudioValidationTest(TestCase):
    """Tests for audio file validation."""

    def test_valid_audio_size_passes(self):
        """Small audio file should pass validation."""
        mock_file = MagicMock()
        mock_file.size = 1 * 1024 * 1024  # 1 MB
        validate_audio_file(mock_file)
        # No exception means pass

    def test_audio_over_size_limit_fails(self):
        """Audio file over max size should fail."""
        mock_file = MagicMock()
        mock_file.size = INPUT_LIMITS['AUDIO_MAX_SIZE'] + 1
        with self.assertRaises(ValidationError) as ctx:
            validate_audio_file(mock_file)
        self.assertEqual(ctx.exception.code, 'audio_too_large')

    def test_valid_audio_duration_passes(self):
        """Audio with valid duration should pass."""
        # 30 seconds of audio (~300 KB at 10 KB/s)
        mock_file = MagicMock()
        mock_file.size = 30 * 10 * 1024  # 30 sec * 10 KB/s
        validate_audio_duration(mock_file)
        # No exception means pass

    def test_audio_too_short_fails(self):
        """Very short audio should fail."""
        mock_file = MagicMock()
        mock_file.size = 100  # Very small file = ~0.01 seconds
        with self.assertRaises(ValidationError) as ctx:
            validate_audio_duration(mock_file)
        self.assertEqual(ctx.exception.code, 'audio_too_short')

    def test_audio_too_long_fails(self):
        """Very long audio should fail."""
        # 150 seconds of audio (over 120 sec limit)
        mock_file = MagicMock()
        mock_file.size = 150 * 10 * 1024  # 150 sec
        with self.assertRaises(ValidationError) as ctx:
            validate_audio_duration(mock_file)
        self.assertEqual(ctx.exception.code, 'audio_too_long')

    def test_none_audio_passes(self):
        """None audio should pass."""
        validate_audio_file(None)
        validate_audio_duration(None)
        # No exception means pass


class MaxFileSizeValidatorTest(TestCase):
    """Tests for the MaxFileSizeValidator class."""

    def test_validator_passes_valid_file(self):
        """File under limit should pass."""
        validator = MaxFileSizeValidator(5 * 1024 * 1024)  # 5 MB
        mock_file = MagicMock()
        mock_file.size = 1 * 1024 * 1024  # 1 MB
        # Should not raise
        validator(mock_file)

    def test_validator_fails_oversized_file(self):
        """File over limit should fail."""
        validator = MaxFileSizeValidator(5 * 1024 * 1024)  # 5 MB
        mock_file = MagicMock()
        mock_file.size = 6 * 1024 * 1024  # 6 MB
        with self.assertRaises(ValidationError):
            validator(mock_file)


class CombinedValidatorTest(TestCase):
    """Tests for the combined validate_input function."""

    def test_valid_text_only(self):
        """Valid text without image/audio should pass."""
        validate_input(content="This is a valid thought.")

    def test_valid_image_only(self):
        """Valid image without text should pass."""
        mock_image = MagicMock()
        mock_image.size = 1 * 1024 * 1024
        validate_input(image=mock_image)

    def test_invalid_text_raises(self):
        """Invalid text should raise with content error."""
        over_max = "a" * (INPUT_LIMITS['TEXT_MAX_LENGTH'] + 1)
        with self.assertRaises(ValidationError) as ctx:
            validate_input(content=over_max)
        self.assertIn('content', ctx.exception.message_dict)

    def test_invalid_image_raises(self):
        """Invalid image should raise with image error."""
        mock_image = MagicMock()
        mock_image.size = 10 * 1024 * 1024  # 10 MB
        with self.assertRaises(ValidationError) as ctx:
            validate_input(image=mock_image)
        self.assertIn('image', ctx.exception.message_dict)


class FormValidationTest(TestCase):
    """Tests for InputForm validation."""

    def test_form_valid_text(self):
        """Form with valid text should be valid."""
        from plexus.forms import InputForm
        form = InputForm(data={'content': 'A valid thought', 'source': 'web'})
        self.assertTrue(form.is_valid(), form.errors)

    def test_form_empty_content_no_image_invalid(self):
        """Form with no content and no image should be invalid."""
        from plexus.forms import InputForm
        form = InputForm(data={'content': '', 'source': 'web'})
        self.assertFalse(form.is_valid())

    def test_form_text_too_long_invalid(self):
        """Form with text over limit should be invalid."""
        from plexus.forms import InputForm
        long_text = "a" * (INPUT_LIMITS['TEXT_MAX_LENGTH'] + 1)
        form = InputForm(data={'content': long_text, 'source': 'web'})
        self.assertFalse(form.is_valid())
        self.assertIn('content', form.errors)


class SerializerValidationTest(TestCase):
    """Tests for InputSerializer validation."""

    def test_serializer_valid_text(self):
        """Serializer with valid text should be valid."""
        from plexus.serializers import InputSerializer
        serializer = InputSerializer(data={'content': 'A valid thought', 'source': 'web'})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_text_too_long_invalid(self):
        """Serializer with text over limit should be invalid."""
        from plexus.serializers import InputSerializer
        long_text = "a" * (INPUT_LIMITS['TEXT_MAX_LENGTH'] + 1)
        serializer = InputSerializer(data={'content': long_text, 'source': 'web'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('content', serializer.errors)
