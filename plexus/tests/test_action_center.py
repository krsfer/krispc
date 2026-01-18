from django.urls import reverse
from django.contrib.auth.models import User
from django.test import TestCase
from plexus.models import Input, Thought, Action

class ActionCenterTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_login(self.user)
        self.input_obj = Input.objects.create(content="A thought with actions")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Structured thought",
            type="task",
            confidence_score=0.9
        )
        self.action_pending = Action.objects.create(
            thought=self.thought,
            description="Pending action",
            status="pending"
        )
        self.action_done = Action.objects.create(
            thought=self.thought,
            description="Done action",
            status="done"
        )
        self.list_url = reverse("plexus:action_center")

    def test_action_center_requires_login(self):
        self.client.logout()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 302)

    def test_action_center_list_default_pending(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Pending action")
        self.assertNotContains(response, "Done action")

    def test_action_center_list_filter_done(self):
        response = self.client.get(self.list_url, {"status": "done"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Done action")
        self.assertNotContains(response, "Pending action")

    def test_action_toggle_status(self):
        toggle_url = reverse("plexus:action_toggle", kwargs={"pk": self.action_pending.pk})
        
        # Toggle from pending to done
        response = self.client.post(toggle_url)
        self.assertEqual(response.status_code, 302)
        self.action_pending.refresh_from_db()
        self.assertEqual(self.action_pending.status, "done")
        
        # Toggle back from done to pending
        response = self.client.post(toggle_url)
        self.action_pending.refresh_from_db()
        self.assertEqual(self.action_pending.status, "pending")
