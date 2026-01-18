from django.test import TestCase
from django.utils import timezone
from plexus.models import Input, Thought, ReviewQueue

class ReviewQueueModelTest(TestCase):
    def setUp(self):
        self.input_obj = Input.objects.create(content="Uncertain thought")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="I think this is a task",
            type="task",
            confidence_score=0.45
        )

    def test_create_review_item(self):
        """
        Test that a ReviewQueue item can be created linked to a Thought.
        """
        review_item = ReviewQueue.objects.create(
            thought=self.thought,
            reason="Low confidence score: 0.45",
            status="pending"
        )
        self.assertEqual(review_item.thought, self.thought)
        self.assertEqual(review_item.reason, "Low confidence score: 0.45")
        self.assertEqual(review_item.status, "pending")
        self.assertIsNotNone(review_item.created_at)

    def test_default_status_pending(self):
        """
        Test that status defaults to 'pending'.
        """
        review_item = ReviewQueue.objects.create(
            thought=self.thought,
            reason="Test reason"
        )
        self.assertEqual(review_item.status, "pending")

    def test_status_choices(self):
        """
        Test that 'status' field respects choices.
        """
        review_item = ReviewQueue(
            thought=self.thought,
            reason="Reason",
            status="invalid_status"
        )
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            review_item.full_clean()

    def test_string_representation(self):
        """
        Test the string representation of the ReviewQueue model.
        """
        review_item = ReviewQueue.objects.create(
            thought=self.thought,
            reason="Low confidence",
            status="pending"
        )
        expected_str = f"Review: {self.thought} (pending)"
        self.assertEqual(str(review_item), expected_str)
