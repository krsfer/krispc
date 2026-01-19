from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import PageVisit, UserInteraction, ErrorEvent

class UserInteractionInline(admin.TabularInline):
    model = UserInteraction
    extra = 0
    readonly_fields = ('interaction_type', 'element_selector', 'timestamp', 'metadata')
    can_delete = False

class ErrorEventInline(admin.TabularInline):
    model = ErrorEvent
    extra = 0
    readonly_fields = ('status_code', 'error_message', 'stack_trace', 'timestamp')
    can_delete = False

@admin.register(PageVisit)
class PageVisitAdmin(admin.ModelAdmin):
    change_list_template = "analytics/admin/pagevisit_change_list.html"
    list_display = ('url', 'timestamp', 'user', 'browser', 'os', 'device_type', 'network_type', 'ttfb', 'lcp', 'scroll_depth')
    list_filter = ('method', 'device_type', 'browser', 'os', 'timestamp', 'network_type')
    search_fields = ('url', 'path', 'user__email', 'ip_address')
    readonly_fields = ('timestamp', 'session_key', 'ip_address', 'user_agent')
    inlines = [UserInteractionInline, ErrorEventInline]
    
    fieldsets = (
        ('Session Info', {
            'fields': ('user', 'session_key', 'ip_address', 'timestamp', 'user_agent')
        }),
        ('Page Info', {
            'fields': ('url', 'path', 'method', 'referrer')
        }),
        ('Performance Metrics', {
            'fields': ('ttfb', 'lcp', 'cls', 'inp', 'fcp')
        }),
        ('Environment', {
            'fields': ('browser', 'os', 'device_type', 'network_type')
        }),
        ('Engagement', {
            'fields': ('scroll_depth', 'time_on_page')
        }),
    )

@admin.register(UserInteraction)
class UserInteractionAdmin(admin.ModelAdmin):
    list_display = ('interaction_type', 'visit', 'timestamp')
    list_filter = ('interaction_type', 'timestamp')
    search_fields = ('element_selector',)
    readonly_fields = ('timestamp',)

@admin.register(ErrorEvent)
class ErrorEventAdmin(admin.ModelAdmin):
    list_display = ('status_code', 'url', 'timestamp', 'visit')
    list_filter = ('status_code', 'timestamp')
    search_fields = ('url', 'error_message')
    readonly_fields = ('timestamp',)