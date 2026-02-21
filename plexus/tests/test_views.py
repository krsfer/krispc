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
        self.input_obj = Input.objects.create(content="A thought", source="web", user=self.user)
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
        input2 = Input.objects.create(content="Buy milk", user=self.user)
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
        input2 = Input.objects.create(content="Buy milk", user=self.user)
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

    def test_dashboard_unprocessed_input(self):
        # Create an unprocessed input
        Input.objects.create(content="Pending thought", user=self.user, processed=False)
        with translation.override("en"):
            response = self.client.get(self.url, HTTP_ACCEPT_LANGUAGE="en")
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, "Pending thought")
            self.assertContains(response, "AI is processing your thought...")
            self.assertNotContains(response, "AI is transmuting your thought...")
            self.assertContains(response, "animate-pulse")
            self.assertContains(response, "processing-card")
            self.assertContains(response, "data-input-id=")
            self.assertContains(response, "checkProcessingStatus")
            self.assertContains(response, "showTimeoutState")
            self.assertContains(response, "Still processing. Refresh manually.")


class InputStatusViewTest(APITestCase):
    def setUp(self):
        self.url = reverse("plexus:input_status")
        self.user = User.objects.create_user(username="status-user", password="password")
        self.client.force_login(self.user)

    def test_processed_input_with_thought_returns_processed_id(self):
        input_obj = Input.objects.create(content="Done input", user=self.user, processed=True)
        Thought.objects.create(
            input=input_obj,
            content="Done thought",
            type="ideation",
            confidence_score=0.9,
            ai_model="test-model",
        )

        response = self.client.post(self.url, {"input_ids": [input_obj.id]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["processed_ids"], [input_obj.id])
        self.assertEqual(response.data["failed_ids"], [])

    def test_processed_duplicate_without_thought_is_treated_as_processed(self):
        duplicate_input = Input.objects.create(content="Duplicate input", user=self.user, processed=True)

        response = self.client.post(self.url, {"input_ids": [duplicate_input.id]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["processed_ids"], [duplicate_input.id])
        self.assertEqual(response.data["failed_ids"], [])

    def test_processor_error_thought_returns_failed_id(self):
        failed_input = Input.objects.create(content="Failed input", user=self.user, processed=True)
        Thought.objects.create(
            input=failed_input,
            content="(Processing failed)",
            type="ideation",
            confidence_score=0.0,
            ai_model="processor-error: ValueError",
        )

        response = self.client.post(self.url, {"input_ids": [failed_input.id]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["processed_ids"], [])
        self.assertEqual(response.data["failed_ids"], [failed_input.id])

    def test_unprocessed_input_is_not_returned(self):
        pending_input = Input.objects.create(content="Pending input", user=self.user, processed=False)

        response = self.client.post(self.url, {"input_ids": [pending_input.id]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["processed_ids"], [])
        self.assertEqual(response.data["failed_ids"], [])

    def test_missing_or_foreign_ids_return_failed(self):
        other_user = User.objects.create_user(username="other-user", password="password")
        foreign_input = Input.objects.create(content="Other input", user=other_user, processed=True)
        missing_id = foreign_input.id + 999

        response = self.client.post(self.url, {"input_ids": [foreign_input.id, missing_id]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["processed_ids"], [])
        self.assertCountEqual(response.data["failed_ids"], [foreign_input.id, missing_id])

    def test_requires_authentication(self):
        self.client.logout()
        response = self.client.post(self.url, {"input_ids": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
