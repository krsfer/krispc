from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import translation
from rest_framework import status
from rest_framework.test import APITestCase
from plexus.models import Input, Thought

class IngestAPIViewTest(APITestCase):
    def setUp(self):
        self.url = reverse("plexus:ingest")
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_authenticate(user=self.user)

    def test_ingest_content_success(self):
        data = {
            "content": "A thought from API",
            "source": "api"
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Input.objects.count(), 1)
        self.assertEqual(Input.objects.get().content, "A thought from API")
        self.assertEqual(Input.objects.get().source, "api")

    def test_ingest_content_missing_fail(self):
        data = {
            "source": "api"
        }
        response = self.client.post(self.url, data, format="json")
        # Content is now optional, so it returns 201 instead of 400
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_ingest_default_source(self):
        data = {
            "content": "Implicit source"
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Input.objects.get().source, "web")

    def test_unauthenticated_access_denied(self):
        self.client.logout()
        data = {"content": "Secret thought"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class CaptureViewTest(APITestCase):
    def setUp(self):
        self.url = reverse("plexus:capture")
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_login(self.user)

    def test_capture_get(self):
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "plexus/capture.html")

    def test_capture_post_success(self):
        data = {
            "content": "Web captured thought",
            "source": "web"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, 302) # Redirect to dashboard
        self.assertTrue(Input.objects.filter(content="Web captured thought").exists())

class DashboardViewTest(APITestCase):
    def setUp(self):
        self.url = reverse("plexus:dashboard")
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_login(self.user)
        self.input_obj = Input.objects.create(content="A thought", source="web")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Structured thought",
            type="ideation",
            confidence_score=0.8
        )

    def test_dashboard_get(self):
        with translation.override("en"):
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, 200)
            self.assertTemplateUsed(response, "plexus/dashboard.html")
            self.assertContains(response, "Structured thought")
            # Check for English or French display type
            content = response.content.decode()
            self.assertTrue("Ideation" in content or "Idéation" in content)

    def test_dashboard_search(self):
        # Create another thought
        input2 = Input.objects.create(content="Buy milk")
        Thought.objects.create(
            input=input2,
            content="Shopping list",
            type="task",
            confidence_score=0.9
        )
        
        # Search for 'Shopping'
        response = self.client.get(self.url, {"q": "Shopping"})
        self.assertContains(response, "Shopping list")
        self.assertNotContains(response, "Structured thought")
        
        # Search for 'thought' (case insensitive check)
        response = self.client.get(self.url, {"q": "THOUGHT"})
        self.assertContains(response, "Structured thought")
        self.assertNotContains(response, "Shopping list")

    def test_dashboard_filter_type(self):
        # Create another thought of type 'task'
        input2 = Input.objects.create(content="Buy milk")
        Thought.objects.create(
            input=input2,
            content="Shopping list",
            type="task",
            confidence_score=0.9
        )
        
        # Filter for 'task'
        with translation.override("en"):
            response = self.client.get(self.url, {"type": "task"})
            self.assertContains(response, "Shopping list")
            self.assertNotContains(response, "Structured thought")
        
        # Filter for 'ideation'
        with translation.override("en"):
            response = self.client.get(self.url, {"type": "ideation"})
            self.assertContains(response, "Structured thought")
            self.assertNotContains(response, "Shopping list")

    def test_dashboard_links(self):
        from plexus.models import ThoughtLink
        
        target_thought = Thought.objects.create(
            input=self.input_obj,
            content="Linked Target",
            type="reference",
            confidence_score=0.9
        )
        
        ThoughtLink.objects.create(
            source=self.thought,
            target=target_thought,
            reason="Because they are related"
        )
        
        with translation.override("en"):
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, "Linked Target")
            content = response.content.decode()
            self.assertTrue("Related Thoughts" in content or "Pensées liées" in content)

