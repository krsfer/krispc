from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class PageVisit(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    session_key = models.CharField(max_length=40, null=True, blank=True)
    url = models.URLField(max_length=500)
    path = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    referrer = models.URLField(max_length=500, null=True, blank=True)
    
    # Technical Metrics (Core Web Vitals & Performance)
    ttfb = models.FloatField(help_text="Time to First Byte (ms)", null=True, blank=True)
    lcp = models.FloatField(help_text="Largest Contentful Paint (ms)", null=True, blank=True)
    cls = models.FloatField(help_text="Cumulative Layout Shift", null=True, blank=True)
    inp = models.FloatField(help_text="Interaction to Next Paint (ms)", null=True, blank=True)
    fcp = models.FloatField(help_text="First Contentful Paint (ms)", null=True, blank=True)
    
    # Environment
    browser = models.CharField(max_length=100, null=True, blank=True)
    os = models.CharField(max_length=100, null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True)  # mobile, desktop, tablet
    network_type = models.CharField(max_length=50, null=True, blank=True) # 4g, wifi, etc.
    
    # Engagement
    scroll_depth = models.FloatField(default=0, help_text="Percentage scrolled")
    time_on_page = models.FloatField(default=0, help_text="Seconds spent on page")

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _("Page Visit")
        verbose_name_plural = _("Page Visits")

    def __str__(self):
        return f"{self.path} at {self.timestamp}"


class ErrorEvent(models.Model):
    visit = models.ForeignKey(PageVisit, on_delete=models.SET_NULL, null=True, blank=True)
    url = models.URLField(max_length=500)
    status_code = models.PositiveIntegerField()
    error_message = models.TextField(null=True, blank=True)
    stack_trace = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _("Error Event")
        verbose_name_plural = _("Error Events")

    def __str__(self):
        return f"{self.status_code} on {self.url}"


class UserInteraction(models.Model):
    INTERACTION_TYPES = [
        ('rage_click', 'Rage Click'),
        ('click', 'Click'),
        ('form_submit', 'Form Submit'),
        ('cart_add', 'Add to Cart'),
        ('checkout', 'Checkout'),
        ('custom', 'Custom'),
    ]

    visit = models.ForeignKey(PageVisit, on_delete=models.CASCADE, related_name='interactions')
    interaction_type = models.CharField(max_length=50, choices=INTERACTION_TYPES)
    element_selector = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _("User Interaction")
        verbose_name_plural = _("User Interactions")

    def __str__(self):
        return f"{self.interaction_type} on {self.visit}"