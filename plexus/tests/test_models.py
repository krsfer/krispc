from django.test import TestCase
from django.utils import timezone
from plexus.models import Input, Thought, Action

class InputModelTest(TestCase):
    def test_create_input(self):
        """
        Test that an Input object can be created with content, source, and timestamp.
        """
        input_obj = Input.objects.create(
            content="Buy milk",
            source="web",
            processed=False
        )
        self.assertEqual(input_obj.content, "Buy milk")
        self.assertEqual(input_obj.source, "web")
        self.assertFalse(input_obj.processed)
        self.assertIsNotNone(input_obj.timestamp)
        # Ensure timestamp is recent (within last minute)
        now = timezone.now()
        self.assertTrue((now - input_obj.timestamp).total_seconds() < 60)

    def test_default_processed_false(self):
        """
        Test that 'processed' defaults to False.
        """
        input_obj = Input.objects.create(
            content="Another thought",
            source="mobile"
        )
        self.assertFalse(input_obj.processed)

    def test_string_representation(self):
        """
        Test the string representation of the Input model.
        """
        input_obj = Input.objects.create(
            content="Short thought",
            source="web"
        )
        # Assuming we want the string repr to be truncated content
        self.assertEqual(str(input_obj), "Short thought")
        
        long_input = Input.objects.create(
            content="This is a very long thought that should be truncated in the string representation",
            source="web"
        )
        self.assertTrue(len(str(long_input)) <= 53) # 50 chars + "..."

class ThoughtModelTest(TestCase):
    def setUp(self):
        self.input_obj = Input.objects.create(content="Buy milk")

    def test_create_thought(self):
        """
        Test that a Thought object can be created linked to an Input.
        """
        thought = Thought.objects.create(
            input=self.input_obj,
            content="Task: Buy milk",
            type="task",
            confidence_score=0.95
        )
        self.assertEqual(thought.input, self.input_obj)
        self.assertEqual(thought.content, "Task: Buy milk")
        self.assertEqual(thought.type, "task")
        self.assertEqual(thought.confidence_score, 0.95)

    def test_type_choices(self):
        """
        Test that 'type' field respects choices.
        """
        thought = Thought(
            input=self.input_obj,
            content="Idea",
            type="invalid_type"
        )
        # Note: Model.full_clean() performs validation
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            thought.full_clean()

    def test_confidence_score_range(self):
        """
        Test that confidence score storage.
        """
        thought = Thought.objects.create(
            input=self.input_obj,
            content="Idea",
            confidence_score=1.5
        )
        self.assertEqual(thought.confidence_score, 1.5)

class ActionModelTest(TestCase):
    def setUp(self):
        self.input_obj = Input.objects.create(content="Buy milk")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Task: Buy milk",
            type="task",
            confidence_score=0.9
        )

    def test_create_action(self):
        """
        Test that an Action object can be created linked to a Thought.
        """
        action = Action.objects.create(
            thought=self.thought,
            description="Go to grocery store and buy milk",
            status="pending"
        )
        self.assertEqual(action.thought, self.thought)
        self.assertEqual(action.description, "Go to grocery store and buy milk")
        self.assertEqual(action.status, "pending")

    def test_status_choices(self):
        """
        Test that 'status' field respects choices.
        """
        action = Action(
            thought=self.thought,
            description="Do something",
            status="invalid_status"
        )
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            action.full_clean()
