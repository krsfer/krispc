from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from plexus.models import Input, Thought, Action
from datetime import timedelta
import time

class SyncApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("plexus:sync")

        # Create some initial data
        self.input1 = Input.objects.create(content="Sync test input 1")
        self.thought1 = Thought.objects.create(
            input=self.input1, 
            content="Sync test thought 1", 
            type="ideation",
            confidence_score=0.8
        )
        self.action1 = Action.objects.create(
            thought=self.thought1, 
            description="Sync test action 1",
            status="pending"
        )

    def test_sync_pull_initial(self):
        """Test initial sync (no timestamp provided) returns all data."""
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn("sync_timestamp", data)
        self.assertIn("updates", data)
        self.assertTrue(len(data["updates"]["inputs"]) >= 1)
        self.assertTrue(len(data["updates"]["thoughts"]) >= 1)
        self.assertTrue(len(data["updates"]["actions"]) >= 1)

    def test_sync_pull_incremental(self):
        """Test incremental sync returns only new/updated data."""
        checkpoint = timezone.now()
        time.sleep(0.1) 
        
        # Create/Update after checkpoint
        input2 = Input.objects.create(content="Sync test input 2")
        self.action1.description = "Updated action"
        self.action1.save()
        
        response = self.client.post(self.url, {"last_sync_timestamp": checkpoint.isoformat()})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        
        input_ids = [i["id"] for i in data["updates"]["inputs"]]
        self.assertIn(input2.id, input_ids)
        self.assertNotIn(self.input1.id, input_ids)
        
        action_ids = [a["id"] for a in data["updates"]["actions"]]
        self.assertIn(self.action1.id, action_ids)

    def test_sync_push_create(self):
        """Test pushing a new input creates it."""
        changes = {
            "inputs": [
                {"content": "Offline Created Input", "source": "mobile"}
            ]
        }
        
        response = self.client.post(self.url, {"changes": changes}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it exists in DB
        self.assertTrue(Input.objects.filter(content="Offline Created Input").exists())

    def test_sync_push_update(self):
        """Test pushing an update modifies the existing item."""
        changes = {
            "thoughts": [
                {
                    "id": self.thought1.id,
                    "content": "Offline Updated Thought"
                }
            ]
        }
        
        response = self.client.post(self.url, {"changes": changes}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.thought1.refresh_from_db()
        self.assertEqual(self.thought1.content, "Offline Updated Thought")