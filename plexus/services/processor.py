from django.db.models import Q
from plexus.models import Input, Thought, Action, ReviewQueue
from .llm import classify_input
from .linking import find_relevant_links

class InputProcessor:
    """
    Framework-agnostic processor for Plexus Inputs.
    This class can be called from Celery tasks, management commands, 
    or interactive sessions.
    """
    
    CONFIDENCE_THRESHOLD = 0.75

    def __init__(self, input_obj: Input):
        self.input_obj = input_obj

    def process(self):
        """
        The main processing pipeline.
        Returns the created/updated Thought or a string message if skipped.
        """
        # 1. Call LLM service
        result = classify_input(self.input_obj.content, self.input_obj.image)
        refined_content = result["refined_content"]

        # 2. Semantic Deduplication Check
        duplicate = self._find_duplicate(refined_content)
        if duplicate:
            self.input_obj.processed = True
            self.input_obj.save()
            return f"Duplicate detected: Linked to Thought {duplicate.id}"

        # 3. Create or Update Thought
        thought, created = Thought.objects.update_or_create(
            input=self.input_obj,
            defaults={
                "content": refined_content,
                "type": result["classification"],
                "confidence_score": result["confidence_score"],
                "ai_model": result.get("ai_model", "unknown")
            }
        )

        # 4. Handle Actions
        self._sync_actions(thought, result["actions"], recreated=not created)

        # 5. Handle Review Queue (Bouncer Logic)
        self._manage_review_queue(thought)

        # 6. Trigger Auto-Linking
        find_relevant_links(thought)

        # 7. Mark input as processed
        self.input_obj.processed = True
        self.input_obj.save()
        
        return thought

    def _find_duplicate(self, refined_content):
        query = Q(content=refined_content)
        if self.input_obj.content:
            query |= Q(input__content=self.input_obj.content)
        return Thought.objects.filter(query).exclude(input=self.input_obj).first()

    def _sync_actions(self, thought, action_list, recreated=False):
        if recreated:
            Action.objects.filter(thought=thought).delete()

        for action_text in action_list:
            Action.objects.create(
                thought=thought,
                description=action_text,
                status="pending"
            )

    def _manage_review_queue(self, thought):
        ReviewQueue.objects.filter(thought=thought).delete()
        if thought.confidence_score < self.CONFIDENCE_THRESHOLD:
            ReviewQueue.objects.create(
                thought=thought,
                reason=f"Low confidence score: {thought.confidence_score}",
                status="pending"
            )
