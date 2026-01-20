"""
Tests for P2C serializers.

Tests cover DocumentSerializer validation including file type, size, and format checks.
"""
from io import BytesIO
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError as DRFValidationError

from p2c.serializers import DocumentSerializer


class DocumentSerializerTest(TestCase):
    """Test cases for DocumentSerializer."""
    
    def test_serializer_valid_pdf(self):
        """Test serializer accepts valid PDF file."""
        pdf_content = b"%PDF-1.4 test content"
        file = SimpleUploadedFile(
            "test.pdf",
            pdf_content,
            content_type="application/pdf"
        )
        serializer = DocumentSerializer(data={"file": file})
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_serializer_rejects_non_pdf_content_type(self):
        """Test serializer rejects files with non-PDF content type."""
        file = SimpleUploadedFile(
            "test.txt",
            b"%PDF-1.4 fake pdf",
            content_type="text/plain"
        )
        serializer = DocumentSerializer(data={"file": file})
        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)
        self.assertIn("Only PDF files are allowed", str(serializer.errors["file"]))
    
    def test_serializer_rejects_invalid_pdf_header(self):
        """Test serializer rejects files without proper PDF header."""
        file = SimpleUploadedFile(
            "test.pdf",
            b"Not a real PDF file",
            content_type="application/pdf"
        )
        serializer = DocumentSerializer(data={"file": file})
        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)
        self.assertIn("Invalid PDF format", str(serializer.errors["file"]))
    
    def test_serializer_rejects_empty_file(self):
        """Test serializer rejects empty files."""
        file = SimpleUploadedFile(
            "empty.pdf",
            b"",
            content_type="application/pdf"
        )
        serializer = DocumentSerializer(data={"file": file})
        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)
    
    def test_serializer_rejects_oversized_file(self):
        """Test serializer rejects files larger than 10MB."""
        # Create a file just over 10MB
        large_content = b"%PDF-1.4" + (b"x" * (10 * 1024 * 1024 + 100))
        file = SimpleUploadedFile(
            "large.pdf",
            large_content,
            content_type="application/pdf"
        )
        serializer = DocumentSerializer(data={"file": file})
        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)
        self.assertIn("File too large", str(serializer.errors["file"]))
    
    def test_serializer_missing_file(self):
        """Test serializer requires file field."""
        serializer = DocumentSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)
    
    def test_serializer_read_only_fields(self):
        """Test that read-only fields cannot be set via serializer."""
        pdf_content = b"%PDF-1.4 test content"
        file = SimpleUploadedFile(
            "test.pdf",
            pdf_content,
            content_type="application/pdf"
        )
        serializer = DocumentSerializer(data={
            "file": file,
            "processed": True,  # Should be ignored
            "processing": True,  # Should be ignored
            "error_message": "Hacked!",  # Should be ignored
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        # Read-only fields should not be in validated_data
        self.assertNotIn("processed", serializer.validated_data)
        self.assertNotIn("processing", serializer.validated_data)
        self.assertNotIn("error_message", serializer.validated_data)
    
    def test_serializer_output_structure(self):
        """Test serializer output includes expected fields."""
        expected_fields = {"id", "file", "user", "uploaded_at", "processed", "processing", "error_message"}
        serializer = DocumentSerializer()
        self.assertEqual(set(serializer.fields.keys()), expected_fields)
