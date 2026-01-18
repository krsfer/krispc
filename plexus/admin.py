from django.contrib import admin
from .models import Input, Thought, Action, ReviewQueue, SystemConfiguration

@admin.register(Input)
class InputAdmin(admin.ModelAdmin):
    list_display = ("content_preview", "source", "timestamp", "processed")
    list_filter = ("source", "processed", "timestamp")
    search_fields = ("content",)

    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content

@admin.register(Thought)
class ThoughtAdmin(admin.ModelAdmin):
    list_display = ("content_preview", "type", "confidence_score", "input_id")
    list_filter = ("type",)
    search_fields = ("content",)

    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content

@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ("description_preview", "status", "thought_id")
    list_filter = ("status",)
    search_fields = ("description",)

    def description_preview(self, obj):
        return obj.description[:50] + "..." if len(obj.description) > 50 else obj.description

@admin.register(ReviewQueue)

class ReviewQueueAdmin(admin.ModelAdmin):

    list_display = ("thought", "status", "created_at", "reason")

    list_filter = ("status", "created_at")

    search_fields = ("reason", "thought__content")



@admin.register(SystemConfiguration)

class SystemConfigurationAdmin(admin.ModelAdmin):

    list_display = ("active_ai_provider",)

    

    def has_add_permission(self, request):

        # Only allow adding if no object exists

        return not SystemConfiguration.objects.exists()
