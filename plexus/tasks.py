from celery import shared_task
from django.utils import timezone
import logging
from .models import Input, Thought
from .services.processor import InputProcessor

logger = logging.getLogger(__name__)

@shared_task
def process_input(input_id):
    """
    Asynchronous wrapper around InputProcessor.
    """
    try:
        input_obj = Input.objects.get(id=input_id)
    except Input.DoesNotExist:
        return f"Input {input_id} not found"

    processor = InputProcessor(input_obj)
    try:
        result = processor.process()
    except Exception as exc:
        logger.exception("Input processing failed for input_id=%s", input_id)
        Thought.objects.update_or_create(
            input=input_obj,
            defaults={
                "content": input_obj.content or "(Processing failed)",
                "type": "ideation",
                "confidence_score": 0.0,
                "ai_model": f"processor-error: {exc.__class__.__name__}",
            },
        )
        input_obj.processed = True
        input_obj.save(update_fields=["processed"])
        return f"Processing failed for Input {input_id}: {exc.__class__.__name__}"
    
    if isinstance(result, str):
        return result
    return f"Processed Thought {result.id}"


@shared_task
def check_due_reminders():
    """
    Periodic task (runs every minute via Celery Beat).
    Finds unsent reminders that are due and creates notifications.
    """
    from .models import Reminder, Notification
    
    due_reminders = Reminder.objects.filter(
        is_sent=False,
        remind_at__lte=timezone.now()
    ).select_related('action', 'action__thought')
    
    count = 0
    for reminder in due_reminders:
        Notification.objects.create(
            title=f"Reminder: {reminder.action.description[:50]}",
            message=reminder.message or reminder.action.description,
            notification_type="reminder",
            action=reminder.action
        )
        reminder.is_sent = True
        reminder.save()
        count += 1
    
    return f"Processed {count} reminders"
