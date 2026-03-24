from django.contrib import admin

from .models import StreamConfig


@admin.register(StreamConfig)
class StreamConfigAdmin(admin.ModelAdmin):
    list_display = ("name", "display_name", "enabled", "record", "updated_at")
    list_filter = ("enabled", "record")
    search_fields = ("name", "display_name", "description")
