from celery import shared_task
from django.db.models import Q
from .models import Input, Thought, Action, ReviewQueue
from .services.llm import classify_input
from .services.linking import find_relevant_links

@shared_task
def process_input(input_id):
    """
    Asynchronously processes a raw input using LLM.
    Handles both initial creation and manual re-processing.
    """
    try:
        input_obj = Input.objects.get(id=input_id)
    except Input.DoesNotExist:
        return

    # Call LLM service
    result = classify_input(input_obj.content)
    refined_content = result["refined_content"]

    # Deduplication Check: 
    # 1. Check if a Thought with identical refined content exists
    # 2. OR check if a Thought exists linked to an Input with identical raw content
    duplicate = Thought.objects.filter(
        Q(content=refined_content) | 
        Q(input__content=input_obj.content)
    ).exclude(input=input_obj).first()

    if duplicate:
        # Mark input as processed but don't create new thought
        input_obj.processed = True
        input_obj.save()
        return f"Duplicate detected: Linked to Thought {duplicate.id}"

    # Create or Update Thought
    thought, created = Thought.objects.update_or_create(
        input=input_obj,
        defaults={
            "content": refined_content,
            "type": result["classification"],
            "confidence_score": result["confidence_score"],
            "ai_model": result.get("ai_model", "unknown")
        }
    )

    # Refresh Actions (Delete and Recreate based on new AI output)
    if not created:
        Action.objects.filter(thought=thought).delete()

    for action_text in result["actions"]:
        Action.objects.create(
            thought=thought,
            description=action_text,
            status="pending"
        )

    # Bouncer Logic: Check confidence threshold
    CONFIDENCE_THRESHOLD = 0.75
    # Delete old review if it exists and we are re-processing
    ReviewQueue.objects.filter(thought=thought).delete()
    
    if thought.confidence_score < CONFIDENCE_THRESHOLD:
        ReviewQueue.objects.create(
            thought=thought,
            reason=f"Low confidence score: {thought.confidence_score}",
            status="pending"
        )

    # Trigger Auto-Linking
    find_relevant_links(thought)

    # Mark input as processed
    input_obj.processed = True
    input_obj.save()
