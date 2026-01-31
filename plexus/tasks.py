from celery import shared_task
from django.utils import timezone
from .models import Input
from .services.processor import InputProcessor

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
    result = processor.process()
    
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
