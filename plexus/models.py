from django.db import models
from django.utils import timezone

class SyncableModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

class Input(SyncableModel):
    SOURCE_CHOICES = [
        ("web", "Web"),
        ("mobile", "Mobile"),
        ("api", "API"),
    ]

    content = models.TextField()
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default="web")
    timestamp = models.DateTimeField(default=timezone.now)
    processed = models.BooleanField(default=False)

    def __str__(self):
        return (self.content[:50] + '...') if len(self.content) > 50 else self.content

class Thought(SyncableModel):
    TYPE_CHOICES = [
        ("ideation", "Ideation"),
        ("reference", "Reference"),
        ("task", "Task"),
    ]

    input = models.ForeignKey(Input, on_delete=models.CASCADE, related_name="thoughts")
    content = models.TextField()
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    confidence_score = models.FloatField()
    ai_model = models.CharField(max_length=100, null=True, blank=True, help_text="The AI model used for processing")

    def __str__(self):
        return f"{self.type}: {self.content[:30]}..."

class Action(SyncableModel):

    STATUS_CHOICES = [

        ("pending", "Pending"),

        ("done", "Done"),

        ("dismissed", "Dismissed"),

    ]



    thought = models.ForeignKey(Thought, on_delete=models.CASCADE, related_name="actions")

    description = models.TextField()

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending")



    def __str__(self):

        return f"{self.status}: {self.description[:30]}..."



class ReviewQueue(models.Model):

    STATUS_CHOICES = [

        ("pending", "Pending"),

        ("resolved", "Resolved"),

        ("dismissed", "Dismissed"),

    ]



    thought = models.ForeignKey(Thought, on_delete=models.CASCADE, related_name="reviews")

    reason = models.TextField()

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)



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
        default="gemini"
    )

    active_redis_env = models.CharField(
        max_length=50,
        choices=REDIS_ENVS,
        default="local"
    )

    class Meta:
        verbose_name = "System Configuration"
        verbose_name_plural = "System Configuration"

    def __str__(self):
        return "System Configuration"

    @classmethod
    def get_solo(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)