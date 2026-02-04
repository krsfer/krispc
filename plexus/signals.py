from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Input
from .tasks import process_input

@receiver(post_save, sender=Input)
def trigger_input_processing(sender, instance, created, **kwargs):
    """
    Triggers asynchronous processing of a new Input.
    """
    if getattr(settings, "PLEXUS_DISABLE_INPUT_PROCESSING", False):
        return
    if created and not instance.processed:
        process_input.delay(instance.id)
