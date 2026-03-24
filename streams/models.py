from django.db import models


class StreamConfig(models.Model):
    """Configuration for a managed camera/stream path in MediaMTX."""

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="MediaMTX path name (must match the path configured in mediamtx.yml)",
    )
    display_name = models.CharField(max_length=200, blank=True)
    rtsp_source = models.CharField(
        max_length=500,
        blank=True,
        help_text="RTSP source URL for pull mode (leave blank for push mode)",
    )
    description = models.TextField(blank=True)
    enabled = models.BooleanField(default=True)
    record = models.BooleanField(default=False, help_text="Enable recording for this stream")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.display_name or self.name
