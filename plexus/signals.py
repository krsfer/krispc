from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Input
from .tasks import process_input

@receiver(post_save, sender=Input)
def trigger_input_processing(sender, instance, created, **kwargs):
    """
    Triggers asynchronous processing of a new Input.
    """
    if created and not instance.processed:
        process_input.delay(instance.id)
