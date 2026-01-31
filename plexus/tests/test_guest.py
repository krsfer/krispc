"""
Tests for guest user functionality in Plexus.
"""
from unittest.mock import patch
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from plexus.guest import (
    GUEST_THOUGHT_LIMIT,
    GUEST_USERNAME_PREFIX,
    create_guest_user,
    is_guest_user,
    get_guest_thought_count,
    can_create_thought,
    get_guest_status,
)
from plexus.models import Input, Thought

User = get_user_model()


# We patch process_input at module level for all tests to prevent AI processing
MOCK_TASK_PATH = 'plexus.signals.process_input.delay'


@patch(MOCK_TASK_PATH)
class GuestUserUtilitiesTest(APITestCase):
    """Test guest user utility functions."""
    
    def test_create_guest_user(self, mock_task):
        """Guest user creation returns a valid User with guest prefix."""
        guest = create_guest_user()
        
        self.assertIsNotNone(guest)
        self.assertTrue(guest.is_authenticated)
        self.assertTrue(guest.is_active)
        self.assertTrue(guest.username.startswith(GUEST_USERNAME_PREFIX))
    
    def test_create_guest_user_unique(self, mock_task):
        """Each guest user has a unique username."""
        guest1 = create_guest_user()
        guest2 = create_guest_user()
        
        self.assertNotEqual(guest1.username, guest2.username)
    
    def test_is_guest_user_true(self, mock_task):
        """is_guest_user returns True for guest users."""
        guest = create_guest_user()
        self.assertTrue(is_guest_user(guest))
    
    def test_is_guest_user_false_regular(self, mock_task):
        """is_guest_user returns False for regular users."""
        regular = User.objects.create_user(username="regular", password="pass")
        self.assertFalse(is_guest_user(regular))
    
    def test_is_guest_user_false_none(self, mock_task):
        """is_guest_user returns False for None."""
        self.assertFalse(is_guest_user(None))
    
    def test_get_guest_thought_count_zero(self, mock_task):
        """Newly created guest has 0 thoughts."""
        guest = create_guest_user()
        self.assertEqual(get_guest_thought_count(guest), 0)
    
    def test_get_guest_thought_count_with_thoughts(self, mock_task):
        """Count increases when guest creates thoughts via Input."""
        guest = create_guest_user()
        
        # Create input and thought for guest
        input_obj = Input.objects.create(user=guest, content="Test input")
        Thought.objects.create(
            input=input_obj,
            content="Test thought",
            type="ideation",
            confidence_score=0.9
        )
        
        self.assertEqual(get_guest_thought_count(guest), 1)
    
    def test_can_create_thought_under_limit(self, mock_task):
        """Guest can create thoughts when under limit."""
        guest = create_guest_user()
        can_create, remaining = can_create_thought(guest)
        
        self.assertTrue(can_create)
        self.assertEqual(remaining, GUEST_THOUGHT_LIMIT)
    
    def test_can_create_thought_at_limit(self, mock_task):
        """Guest cannot create thoughts when at limit."""
        guest = create_guest_user()
        
        # Create max thoughts
        for i in range(GUEST_THOUGHT_LIMIT):
            input_obj = Input.objects.create(user=guest, content=f"Input {i}")
            Thought.objects.create(
                input=input_obj,
                content=f"Thought {i}",
                type="task",
                confidence_score=0.8
            )
        
        can_create, remaining = can_create_thought(guest)
        
        self.assertFalse(can_create)
        self.assertEqual(remaining, 0)
    
    def test_can_create_thought_unlimited_for_regular_user(self, mock_task):
        """Regular users have unlimited thoughts (remaining = -1)."""
        regular = User.objects.create_user(username="regular", password="pass")
        can_create, remaining = can_create_thought(regular)
        
        self.assertTrue(can_create)
        self.assertEqual(remaining, -1)
    
    def test_get_guest_status_guest_user(self, mock_task):
        """get_guest_status returns correct dict for guest."""
        guest = create_guest_user()
        status = get_guest_status(guest)
        
        self.assertTrue(status["is_guest"])
        self.assertEqual(status["thought_count"], 0)
        self.assertEqual(status["remaining"], GUEST_THOUGHT_LIMIT)
        self.assertTrue(status["can_create"])
        self.assertEqual(status["limit"], GUEST_THOUGHT_LIMIT)
    
    def test_get_guest_status_regular_user(self, mock_task):
        """get_guest_status returns correct dict for regular user."""
        regular = User.objects.create_user(username="regular", password="pass")
        status = get_guest_status(regular)
        
        self.assertFalse(status["is_guest"])
        self.assertTrue(status["can_create"])


@patch(MOCK_TASK_PATH)
class GuestLoginViewTest(APITestCase):
    """Test guest login view."""
    
    def test_guest_login_creates_user_and_logs_in(self, mock_task):
        """POST to guest_login creates guest user and logs in."""
        url = reverse("plexus:guest_login")
        
        # Count users before
        users_before = User.objects.count()
        
        response = self.client.post(url, follow=True)
        
        # Count users after
        users_after = User.objects.count()
        
        # Should end up at dashboard after following redirects
        self.assertEqual(response.status_code, 200)
        
        # Should have created a new user
        self.assertEqual(users_after, users_before + 1)
        
        # Latest user should be a guest
        latest_user = User.objects.latest('id')
        self.assertTrue(latest_user.username.startswith(GUEST_USERNAME_PREFIX))
    
    def test_guest_can_access_dashboard(self, mock_task):
        """Guest can access dashboard after login."""
        # Create and login as guest directly
        guest = create_guest_user()
        self.client.force_login(guest)
        
        # Then access dashboard
        response = self.client.get(reverse("plexus:dashboard"))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "plexus/dashboard.html")


@patch(MOCK_TASK_PATH)
class GuestCaptureViewTest(APITestCase):
    """Test capture view with guest limits."""
    
    def setUp(self):
        """Login as guest before each test."""
        self.guest = create_guest_user()
        self.client.force_login(self.guest)
    
    def test_guest_can_capture_under_limit(self, mock_task):
        """Guest can capture thoughts when under limit."""
        url = reverse("plexus:capture")
        
        response = self.client.post(url, {
            "content": "My first guest thought",
            "source": "web"
        })
        
        # Should redirect to dashboard on success
        self.assertEqual(response.status_code, 302)
        
        # Should have created an Input owned by guest
        self.assertEqual(Input.objects.filter(user=self.guest).count(), 1)
    
    def test_guest_blocked_at_limit(self, mock_task):
        """Guest cannot capture when at limit."""
        url = reverse("plexus:capture")
        
        # Create max thoughts
        for i in range(GUEST_THOUGHT_LIMIT):
            input_obj = Input.objects.create(user=self.guest, content=f"Input {i}")
            Thought.objects.create(
                input=input_obj,
                content=f"Thought {i}",
                type="task",
                confidence_score=0.8
            )
        
        # Try to capture one more
        response = self.client.post(url, {
            "content": "One thought too many",
            "source": "web"
        })
        
        # Should stay on capture page (redirect to self)
        self.assertEqual(response.status_code, 302)
        
        # Should still only have the original inputs (no new one created)
        self.assertEqual(Input.objects.filter(user=self.guest).count(), GUEST_THOUGHT_LIMIT)
    
    def test_capture_shows_guest_status(self, mock_task):
        """Capture page shows guest status in context."""
        url = reverse("plexus:capture")
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        self.assertIn("guest_status", response.context)
        self.assertTrue(response.context["guest_status"]["is_guest"])


@patch(MOCK_TASK_PATH)
class GuestFilteringTest(APITestCase):
    """Test that guests only see their own thoughts."""
    
    def test_dashboard_only_shows_guest_thoughts(self, mock_task):
        """Guest only sees their own thoughts on dashboard."""
        # Create a regular user with thoughts
        regular = User.objects.create_user(username="regular", password="pass")
        regular_input = Input.objects.create(user=regular, content="Regular input")
        Thought.objects.create(
            input=regular_input,
            content="Regular thought",
            type="ideation",
            confidence_score=0.9
        )
        
        # Create guest and log in
        guest = create_guest_user()
        self.client.force_login(guest)
        
        guest_input = Input.objects.create(user=guest, content="Guest input")
        Thought.objects.create(
            input=guest_input,
            content="Guest thought",
            type="task",
            confidence_score=0.8
        )
        
        # Access dashboard
        response = self.client.get(reverse("plexus:dashboard"))
        
        # Should only see guest's thought
        self.assertContains(response, "Guest thought")
        self.assertNotContains(response, "Regular thought")
