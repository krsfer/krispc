from django.urls import reverse
from django.contrib.auth.models import User
from django.test import TestCase
from plexus.models import Input, Thought, ReviewQueue

class ReviewQueueListViewTest(TestCase):
    def setUp(self):
        self.url = reverse("plexus:review_queue")
        self.user = User.objects.create_user(username="testuser", password="password")
        self.input_obj = Input.objects.create(content="Uncertain input")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Uncertain thought",
            type="ideation",
            confidence_score=0.45
        )
        self.review_item = ReviewQueue.objects.create(
            thought=self.thought,
            reason="Low confidence: 0.45",
            status="pending"
        )
        # A resolved item that should not be in the default list
        self.resolved_thought = Thought.objects.create(
            input=self.input_obj,
            content="Resolved thought",
            type="task",
            confidence_score=0.45
        )
        self.resolved_item = ReviewQueue.objects.create(
            thought=self.resolved_thought,
            reason="Low confidence",
            status="resolved"
        )

    def test_review_queue_requires_login(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302) # Redirect to login

    def test_review_queue_list_pending_only(self):
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "bouncer/queue.html")
        self.assertContains(response, "Uncertain thought")
        self.assertContains(response, "Low confidence: 0.45")
        self.assertNotContains(response, "Resolved thought")

    def test_empty_queue_message(self):
        ReviewQueue.objects.all().delete()
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Your review queue is empty")

class ReviewResolveViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.input_obj = Input.objects.create(content="Uncertain input")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Uncertain thought",
            type="ideation",
            confidence_score=0.45
        )
        self.review_item = ReviewQueue.objects.create(
            thought=self.thought,
            reason="Low confidence: 0.45",
            status="pending"
        )
        self.url = reverse("core:review_resolve", kwargs={"pk": self.review_item.pk})

    def test_review_resolve_requires_login(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_review_resolve_get(self):
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "bouncer/resolve.html")
        self.assertContains(response, "Uncertain thought")

    def test_review_resolve_post_success(self):
        self.client.force_login(self.user)
        data = {
            "content": "Manually corrected thought",
            "type": "task",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, 302) # Redirect to queue
        self.assertRedirects(response, reverse("plexus:review_queue"))
        
        # Verify Thought updated
        self.thought.refresh_from_db()
        self.assertEqual(self.thought.content, "Manually corrected thought")
        self.assertEqual(self.thought.type, "task")
        
        # Verify ReviewQueue marked as resolved
        self.review_item.refresh_from_db()
        self.assertEqual(self.review_item.status, "resolved")

class AdminDashboardViewTest(TestCase):
    def setUp(self):
        self.url = reverse("plexus:admin_dashboard")
        self.user = User.objects.create_user(username="testuser", password="password")
        self.admin = User.objects.create_superuser(username="admin", password="password")

    def test_admin_dashboard_requires_superuser(self):
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403) # Forbidden for non-admin

    def test_admin_dashboard_get_success(self):
        self.client.force_login(self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_dashboard.html")

    def test_admin_dashboard_change_provider(self):
        self.client.force_login(self.admin)
        data = {"active_ai_provider": "openai"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, 302)
        
        from plexus.models import SystemConfiguration
        config = SystemConfiguration.get_solo()
        self.assertEqual(config.active_ai_provider, "openai")

    def test_admin_dashboard_change_redis_env(self):
        self.client.force_login(self.admin)
        data = {"active_redis_env": "cloud"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, 302)
        
        from plexus.models import SystemConfiguration
        config = SystemConfiguration.get_solo()
        self.assertEqual(config.active_redis_env, "cloud")
