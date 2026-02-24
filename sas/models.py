from django.conf import settings
from django.db import models


class SasFile(models.Model):
    MAX_DOWNLOADS = 2

    file = models.FileField(upload_to="sas/")
    caption = models.CharField(max_length=255, blank=True)
    download_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sas_files",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        if self.caption:
            return self.caption
        return self.file.name.rsplit("/", maxsplit=1)[-1]

    @property
    def remaining_downloads(self):
        return max(self.MAX_DOWNLOADS - self.download_count, 0)

    @property
    def can_download(self):
        return self.download_count < self.MAX_DOWNLOADS and self.is_active


class SasAccessLog(models.Model):
    share = models.ForeignKey(SasFile, on_delete=models.CASCADE, related_name="access_logs")
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer = models.TextField(blank=True)
    accept_language = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=8, blank=True)
    path = models.CharField(max_length=255, blank=True)
    was_allowed = models.BooleanField(default=False)
    reason = models.CharField(max_length=64, blank=True)
    geo_latitude = models.FloatField(null=True, blank=True)
    geo_longitude = models.FloatField(null=True, blank=True)
    geo_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "allowed" if self.was_allowed else "blocked"
        return f"{self.ip_address or 'unknown'} ({status})"
