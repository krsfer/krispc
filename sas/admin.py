from django.contrib import admin

from sas.models import SasAccessLog, SasFile


@admin.register(SasFile)
class SasFileAdmin(admin.ModelAdmin):
    list_display = ("id", "caption", "download_count", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("caption", "file")
    readonly_fields = ("download_count", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        if obj.is_active:
            SasFile.objects.exclude(pk=obj.pk).update(is_active=False)


@admin.register(SasAccessLog)
class SasAccessLogAdmin(admin.ModelAdmin):
    list_display = ("id", "share", "ip_address", "was_allowed", "reason", "created_at")
    list_filter = ("was_allowed", "reason", "created_at")
    search_fields = ("ip_address", "user_agent", "referrer")
    readonly_fields = (
        "share",
        "created_at",
        "ip_address",
        "user_agent",
        "referrer",
        "accept_language",
        "method",
        "path",
        "was_allowed",
        "reason",
        "geo_latitude",
        "geo_longitude",
        "geo_payload",
    )
