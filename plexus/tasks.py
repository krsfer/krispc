from celery import shared_task
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
