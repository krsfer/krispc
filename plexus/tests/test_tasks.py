from django.test import TestCase
from unittest.mock import patch
from plexus.models import Input, Thought, Action
from plexus.tasks import process_input

class InputTaskTest(TestCase):
    @patch("plexus.signals.process_input.delay")
    @patch("plexus.services.processor.classify_input")
    def test_process_input_success(self, mock_classify, mock_signal_delay):
        # Setup mock
        mock_classify.return_value = {
            "classification": "task",
            "confidence_score": 0.95,
            "refined_content": "Cleaned buy milk",
            "actions": ["Buy milk at Tesco"],
            "ai_model": "gemini-1.5-pro"
        }
        
        # Create Input
        input_obj = Input.objects.create(content="buy milk", source="web")
        
        # Run task synchronously for test
        process_input(input_obj.id)
        
        # Verify result
        input_obj.refresh_from_db()
        self.assertTrue(input_obj.processed)
        
        # Verify Thought created
        thought = Thought.objects.get(input=input_obj)
        self.assertEqual(thought.type, "task")
        self.assertEqual(thought.confidence_score, 0.95)
        self.assertEqual(thought.content, "Cleaned buy milk")
        self.assertEqual(thought.ai_model, "gemini-1.5-pro")
        
        # Verify Action created
        self.assertEqual(Action.objects.count(), 1)
        action = Action.objects.get(thought=thought)
        self.assertEqual(action.description, "Buy milk at Tesco")

    @patch("plexus.signals.process_input.delay")
    @patch("plexus.services.processor.classify_input")
    def test_process_input_low_confidence(self, mock_classify, mock_signal_delay):
        from plexus.models import ReviewQueue
        # Setup mock with low confidence
        mock_classify.return_value = {
            "classification": "ideation",
            "confidence_score": 0.45,
            "refined_content": "Uncertain thought",
            "actions": []
        }
        
        input_obj = Input.objects.create(content="uncertain input")
        
        process_input(input_obj.id)
        
        # Verify ReviewQueue item created
        self.assertEqual(ReviewQueue.objects.count(), 1)
        review_item = ReviewQueue.objects.first()
        self.assertEqual(review_item.thought.input, input_obj)
        self.assertEqual(review_item.status, "pending")
        self.assertIn("0.45", review_item.reason)

    @patch("plexus.signals.process_input.delay")
    @patch("plexus.services.processor.classify_input")
    def test_process_input_idempotency(self, mock_classify, mock_signal_delay):
        """
        Test that running process_input multiple times updates the existing Thought
        instead of creating duplicates.
        """
        input_obj = Input.objects.create(content="initial content")
        
        # First run
        mock_classify.return_value = {
            "classification": "ideation",
            "confidence_score": 0.8,
            "refined_content": "First classification",
            "actions": ["Action 1"],
            "ai_model": "model-v1"
        }
        process_input(input_obj.id)
        
        self.assertEqual(Thought.objects.count(), 1)
        self.assertEqual(Action.objects.count(), 1)
        
        # Second run (simulating re-classification)
        mock_classify.return_value = {
            "classification": "task",
            "confidence_score": 0.9,
            "refined_content": "Second classification",
            "actions": ["New Action"],
            "ai_model": "model-v2"
        }
        process_input(input_obj.id)
        
        # Verify no duplicates
        self.assertEqual(Thought.objects.count(), 1)
        
        # Verify updates
        thought = Thought.objects.get(input=input_obj)
        self.assertEqual(thought.type, "task")
        self.assertEqual(thought.content, "Second classification")
        self.assertEqual(thought.ai_model, "model-v2")
        
        # Verify actions refreshed
        self.assertEqual(Action.objects.count(), 1)
        self.assertEqual(Action.objects.first().description, "New Action")

    @patch("plexus.signals.process_input.delay")
    @patch("plexus.services.processor.classify_input")
    def test_process_input_deduplication(self, mock_classify, mock_signal_delay):
        """
        Test that if a Thought with identical refined content already exists,
        the task skips creating a duplicate.
        """
        # 1. Create an existing thought
        existing_input = Input.objects.create(content="Original input")
        Thought.objects.create(
            input=existing_input,
            content="Duplicate content",
            type="ideation",
            confidence_score=1.0,
            ai_model="test"
        )
        
        # 2. Process a new input that results in the same refined content
        new_input = Input.objects.create(content="New similar input")
        mock_classify.return_value = {
            "classification": "ideation",
            "confidence_score": 0.9,
            "refined_content": "Duplicate content",
            "actions": [],
            "ai_model": "test"
        }
        
        process_input(new_input.id)
        
        # Verify no new thought created
        self.assertEqual(Thought.objects.count(), 1)
        
        # Verify new input marked as processed
        new_input.refresh_from_db()
        self.assertTrue(new_input.processed)

    @patch("plexus.signals.process_input.delay")
    @patch("plexus.services.processor.classify_input")
    def test_process_input_deduplication_raw_input(self, mock_classify, mock_signal_delay):
        """
        Test that if an Input with identical content has already been processed into a Thought,
        the task skips creating a duplicate even if the AI output differs.
        """
        raw_content = "Same raw input"
        
        # 1. Create an existing thought from this raw input
        existing_input = Input.objects.create(content=raw_content)
        Thought.objects.create(
            input=existing_input,
            content="Refined Version A",
            type="ideation",
            confidence_score=1.0,
            ai_model="test"
        )
        
        # 2. Process a new input with the SAME raw content but DIFFERENT AI output
        new_input = Input.objects.create(content=raw_content)
        mock_classify.return_value = {
            "classification": "ideation",
            "confidence_score": 0.9,
            "refined_content": "Refined Version B", # Different output
            "actions": [],
            "ai_model": "test"
        }
        
        process_input(new_input.id)
        
        # Verify no new thought created
        self.assertEqual(Thought.objects.count(), 1)
        self.assertEqual(Thought.objects.first().content, "Refined Version A")

