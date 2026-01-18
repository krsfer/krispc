from django.urls import reverse
from django.contrib.auth.models import User
from django.test import TestCase
from unittest.mock import patch
from plexus.models import Input, Thought

class ThoughtEditTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_login(self.user)
        self.input_obj = Input.objects.create(content="A thought")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Original content",
            type="ideation",
            confidence_score=0.9
        )
        self.edit_url = reverse("plexus:thought_edit", kwargs={"pk": self.thought.pk})

    def test_thought_edit_requires_login(self):
        self.client.logout()
        response = self.client.get(self.edit_url)
        self.assertEqual(response.status_code, 302)

    def test_thought_edit_get(self):
        response = self.client.get(self.edit_url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "plexus/thought_edit.html")
        self.assertContains(response, "Original content")

    def test_thought_edit_post_success(self):
        data = {
            "content": "Updated content",
            "type": "task"
        }
        response = self.client.post(self.edit_url, data)
        self.assertEqual(response.status_code, 302) # Redirect to dashboard
        
        self.thought.refresh_from_db()
        self.assertEqual(self.thought.content, "Updated content")
        self.assertEqual(self.thought.type, "task")

class ThoughtRetryViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_login(self.user)
        self.input_obj = Input.objects.create(content="Retry test")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Error content",
            type="ideation",
            confidence_score=0.0,
            ai_model="gemini-error"
        )
        self.url = reverse("plexus:thought_retry", kwargs={"pk": self.thought.pk})

    @patch("plexus.tasks.process_input.delay")
    def test_thought_retry_triggers_task(self, mock_task_delay):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 302)
        mock_task_delay.assert_called_once_with(self.input_obj.id)

    @patch("plexus.tasks.process_input.delay")
    def test_thought_edit_reclassify_triggers_task(self, mock_task_delay):
        edit_url = reverse("plexus:thought_edit", kwargs={"pk": self.thought.pk})
        data = {
            "content": "New content for AI",
            "type": "task",
            "reclassify": "on"
        }
        response = self.client.post(edit_url, data)
        self.assertEqual(response.status_code, 302)
        
        # Verify task called
        mock_task_delay.assert_called_once_with(self.input_obj.id)
        
        # Verify content updated even before task runs (synchronous part of view)
        self.thought.refresh_from_db()
        self.assertEqual(self.thought.content, "New content for AI")
