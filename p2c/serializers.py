from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for the Document model."""

    file = serializers.FileField(
        required=True, error_messages={"required": "No file provided"}
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "file",
            "user",
            "uploaded_at",
            "processed",
            "processing",
            "error_message",
        ]
        read_only_fields = [
            "id",
            "user",
            "uploaded_at",
            "processed",
            "processing",
            "error_message",
        ]

    def validate_file(self, value):
        """Validate the uploaded file."""
        if not value.size:
            raise serializers.ValidationError("File is empty", code="empty")

        if value.size > 10 * 1024 * 1024:  # 10MB
            raise serializers.ValidationError(
                "File too large. Maximum size is 10.0MB", code="invalid_extension"
            )

        if value.content_type != "application/pdf":
            raise serializers.ValidationError(
                "Invalid file type. Only PDF files are allowed",
                code="invalid_extension",
            )

        # Always try to read first few bytes to validate PDF format
        try:
            header = value.read(5)
            value.seek(0)  # Reset file pointer
            if not header.startswith(b"%PDF-"):
                raise serializers.ValidationError(
                    "Invalid PDF format", code="invalid_extension"
                )
        except Exception as e:
            raise serializers.ValidationError(
                "Invalid PDF format", code="invalid_extension"
            )

        return value
