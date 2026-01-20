import pytest
from django.core.exceptions import ValidationError
from p2c.models import Document
from p2c.tests.factories import DocumentFactory

@pytest.mark.django_db
class TestModels:
    def test_document_validation_valid_pdf(self):
        doc = DocumentFactory(file__filename="test.pdf", file__data=b"%PDF-1.4 header")
        doc.full_clean()  # Should not raise

    def test_document_validation_invalid_header(self):
        doc = DocumentFactory(file__filename="test.pdf", file__data=b"Not a PDF")
        with pytest.raises(ValidationError) as exc:
            doc.clean()
        assert "Invalid PDF format" in str(exc.value)

    def test_document_validation_invalid_extension(self):
        # FileExtensionValidator runs on full_clean
        doc = DocumentFactory(file__filename="test.txt", file__data=b"%PDF-1.4 header")
        with pytest.raises(ValidationError) as exc:
            doc.full_clean()
        # The error message is localized in French in the actual output: "L'extension de fichier « txt » n’est pas autorisée..."
        # So we check for 'txt' and 'autorisée' or fallback to English
        msg = str(exc.value)
        assert "txt" in msg and ("allowed extensions" in msg or "autoris" in msg)
