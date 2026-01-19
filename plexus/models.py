from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class SyncableModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created at"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Updated at"))
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Deleted at"))

    class Meta:
        abstract = True

class Input(SyncableModel):
    SOURCE_CHOICES = [
        ("web", _("Web")),
        ("mobile", _("Mobile")),
        ("api", _("API")),
    ]

    content = models.TextField(verbose_name=_("Content"), blank=True)
    image = models.ImageField(upload_to="plexus/inputs/", null=True, blank=True, verbose_name=_("Image"))
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default="web", verbose_name=_("Source"))
    timestamp = models.DateTimeField(default=timezone.now, verbose_name=_("Timestamp"))
    processed = models.BooleanField(default=False, verbose_name=_("Processed"))

    class Meta:
        verbose_name = _("Input")
        verbose_name_plural = _("Inputs")

    def __str__(self):
        return (self.content[:50] + '...') if len(self.content) > 50 else self.content

class Thought(SyncableModel):
    TYPE_CHOICES = [
        ("ideation", _("Ideation")),
        ("reference", _("Reference")),
        ("task", _("Task")),
    ]

    input = models.ForeignKey(Input, on_delete=models.CASCADE, related_name="thoughts", verbose_name=_("Input"))
    content = models.TextField(verbose_name=_("Content"))
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, verbose_name=_("Type"))
    confidence_score = models.FloatField(verbose_name=_("Confidence Score"))
    ai_model = models.CharField(max_length=100, null=True, blank=True, help_text=_("The AI model used for processing"), verbose_name=_("AI Model"))

    class Meta:
        verbose_name = _("Thought")
        verbose_name_plural = _("Thoughts")

    def __str__(self):
        return f"{self.type}: {self.content[:30]}..."

class ThoughtLink(models.Model):
    source = models.ForeignKey(Thought, on_delete=models.CASCADE, related_name="outgoing_links", verbose_name=_("Source Thought"))
    target = models.ForeignKey(Thought, on_delete=models.CASCADE, related_name="incoming_links", verbose_name=_("Target Thought"))
    reason = models.TextField(help_text=_("Why these thoughts are connected"), verbose_name=_("Connection Reason"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created at"))

    class Meta:
        unique_together = ('source', 'target')
        verbose_name = _("Thought Link")
        verbose_name_plural = _("Thought Links")

    def __str__(self):
        return f"{self.source.id} -> {self.target.id}"

class Action(SyncableModel):

    STATUS_CHOICES = [

        ("pending", _("Pending")),

        ("done", _("Done")),

        ("dismissed", _("Dismissed")),

    ]



    thought = models.ForeignKey(Thought, on_delete=models.CASCADE, related_name="actions", verbose_name=_("Thought"))

    description = models.TextField(verbose_name=_("Description"))

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending", verbose_name=_("Status"))


    class Meta:
        verbose_name = _("Action")
        verbose_name_plural = _("Actions")

    def __str__(self):

        return f"{self.status}: {self.description[:30]}..."



class ReviewQueue(models.Model):

    STATUS_CHOICES = [

        ("pending", _("Pending")),

        ("resolved", _("Resolved")),

        ("dismissed", _("Dismissed")),

    ]



    thought = models.ForeignKey(Thought, on_delete=models.CASCADE, related_name="reviews", verbose_name=_("Thought"))

    reason = models.TextField(verbose_name=_("Reason"))

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending", verbose_name=_("Status"))

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created at"))


    class Meta:
        verbose_name = _("Review Queue Item")
        verbose_name_plural = _("Review Queue Items")

    def __str__(self):

        return f"Review: {self.thought} ({self.status})"

class SystemConfiguration(models.Model):
    AI_PROVIDERS = [
        ("gemini", "Google Gemini"),
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic"),
    ]

    REDIS_ENVS = [
        ("local", "Local Redis"),
        ("cloud", "Cloud Redis"),
    ]

    active_ai_provider = models.CharField(
        max_length=50, 
        choices=AI_PROVIDERS, 
        default="gemini",
        verbose_name=_("Active AI Provider")
    )

    active_redis_env = models.CharField(
        max_length=50,
        choices=REDIS_ENVS,
        default="local",
        verbose_name=_("Active Redis Env")
    )

    class Meta:
        verbose_name = _("System Configuration")
        verbose_name_plural = _("System Configurations")

    def __str__(self):
        return str(_("System Configuration"))

    @classmethod
    def get_solo(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)