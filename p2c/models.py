"""Models for the P2C application."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver


class P2CUserProfile(models.Model):
    """Profile model to extend the default User with P2C specific fields."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='p2c_profile')
    google_credentials = models.TextField(blank=True, null=True)
    profile_picture = models.URLField(blank=True, null=True)
    last_calendar_id = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "p2c_user_profile"

    def __str__(self):
        return f"P2C Profile for {self.user.username}"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Create or update the user profile when a User is saved."""
    if created:
        P2CUserProfile.objects.create(user=instance)
    else:
        # Ensure profile exists even if not created at sign up
        P2CUserProfile.objects.get_or_create(user=instance)


class Document(models.Model):
    """Model for uploaded PDF documents."""

    class Status(models.TextChoices):
        """Status choices for document processing."""

        PENDING = "PENDING", _("Pending")
        PROCESSING = "PROCESSING", _("Processing")
        COMPLETED = "COMPLETED", _("Completed")
        ERROR = "ERROR", _("Error")

    file = models.FileField(
        upload_to="uploads/",
        validators=[FileExtensionValidator(allowed_extensions=["pdf"])],
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    processing = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Document {self.id} ({self.file.name})"

    def clean(self):
        """Validate the document."""
        super().clean()

        if not self.file:
            raise ValidationError("No file was provided")

        # Check file size
        if self.file.size > 10 * 1024 * 1024:  # 10MB
            raise ValidationError("File size cannot exceed 10MB")

        # Try to read first few bytes to validate PDF format
        try:
            header = self.file.read(5)
            self.file.seek(0)  # Reset file pointer
            if not header.startswith(b"%PDF-"):
                raise ValidationError("Only PDF files are supported")
        except Exception as e:
            raise ValidationError("Invalid PDF format")

    @property
    def error(self):
        """Get error message."""
        return self.error_message


class PlanningSnapshot(models.Model):
    """
    Immutable snapshot of a user's planning at a point in time.
    Stores appointments as a list of dicts in JSON, with metadata for filtering.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="planning_snapshots"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    # data structure: {"appointments": [ { description, normalized_name, day, month, year, start_time, end_time, location, event_description, ... } ]}
    data = models.JSONField(default=dict)
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    origin = models.CharField(
        max_length=32, blank=True, default=""
    )  # e.g., 'text' or 'pdf'
    document = models.ForeignKey(
        "Document", on_delete=models.SET_NULL, null=True, blank=True
    )
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "year", "month", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"Snapshot {self.id} for {self.user_id} at {self.created_at:%Y-%m-%d %H:%M:%S} ({self.month:02d}/{self.year})"


class CalendarBackup(models.Model):
    """Stores backup of deleted calendar events before sync operations."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    calendar_id = models.CharField(max_length=255)
    calendar_name = models.CharField(max_length=255)
    backup_date = models.DateTimeField(auto_now_add=True)
    month = models.IntegerField()  # 1-12
    year = models.IntegerField()
    event_count = models.IntegerField()
    events_json = models.JSONField()  # Full event data from Google Calendar
    sync_operation = models.CharField(
        max_length=50, default="sync_pdf"
    )  # "sync_pdf", "manual_backup"
    json_file_path = models.CharField(
        max_length=500, blank=True, null=True
    )  # Relative path to JSON file in media

    class Meta:
        ordering = ["-backup_date"]
        indexes = [
            models.Index(fields=["user", "-backup_date"]),
            models.Index(fields=["calendar_id", "year", "month"]),
        ]

    def __str__(self):
        return f"{self.calendar_name} - {self.backup_date.strftime('%Y-%m-%d %H:%M')}"