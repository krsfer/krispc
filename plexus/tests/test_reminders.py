"""
Tests for the Plexus reminder and notification system.
"""
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch

from plexus.models import Input, Thought, Action, Reminder, Notification
from plexus.tasks import check_due_reminders

# Middleware without SubdomainRoutingMiddleware for API tests
TEST_MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "hub.middleware.EnsureDefaultLanguageMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "krispc.middleware.APILanguageMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_htmx.middleware.HtmxMiddleware",
    "krispc.middleware.APIRequestLoggingMiddleware",
]

class ReminderModelTest(TestCase):
    """Tests for the Reminder model."""
    
    def setUp(self):
        """Set up test data."""
        self.input = Input.objects.create(content="Test input", source="web")
        self.thought = Thought.objects.create(
            input=self.input,
            content="Test thought",
            type="task",
            confidence_score=0.9,
            ai_model="test"
        )
        self.action = Action.objects.create(
            thought=self.thought,
            description="Test action",
            status="pending"
        )
    
    def test_create_reminder(self):
        """Test creating a reminder."""
        remind_at = timezone.now() + timedelta(hours=1)
        reminder = Reminder.objects.create(
            action=self.action,
            remind_at=remind_at,
            message="Don't forget!"
        )
        
        self.assertEqual(reminder.action, self.action)
        self.assertEqual(reminder.remind_at, remind_at)
        self.assertEqual(reminder.message, "Don't forget!")
        self.assertFalse(reminder.is_sent)
    
    def test_reminder_str(self):
        """Test reminder string representation."""
        remind_at = timezone.now() + timedelta(hours=1)
        reminder = Reminder.objects.create(
            action=self.action,
            remind_at=remind_at
        )
        
        self.assertIn("Test action", str(reminder))


class NotificationModelTest(TestCase):
    """Tests for the Notification model."""
    
    def test_create_notification(self):
        """Test creating a notification."""
        notification = Notification.objects.create(
            title="Test Notification",
            message="This is a test",
            notification_type="system"
        )
        
        self.assertEqual(notification.title, "Test Notification")
        self.assertEqual(notification.message, "This is a test")
        self.assertEqual(notification.notification_type, "system")
        self.assertFalse(notification.is_read)
    
    def test_notification_str(self):
        """Test notification string representation."""
        notification = Notification.objects.create(
            title="Test Notification",
            message="This is a test",
            notification_type="reminder"
        )
        
        self.assertIn("reminder", str(notification))
        self.assertIn("Test Notification", str(notification))


class CheckDueRemindersTaskTest(TestCase):
    """Tests for the check_due_reminders Celery task."""
    
    def setUp(self):
        """Set up test data."""
        self.input = Input.objects.create(content="Test input", source="web")
        self.thought = Thought.objects.create(
            input=self.input,
            content="Test thought",
            type="task",
            confidence_score=0.9,
            ai_model="test"
        )
        self.action = Action.objects.create(
            thought=self.thought,
            description="Complete the task",
            status="pending"
        )
    
    @patch("plexus.signals.process_input.delay")
    def test_due_reminder_creates_notification(self, mock_signal_delay):
        """Test that a due reminder creates a notification."""
        # Create a reminder that is already due
        past_time = timezone.now() - timedelta(hours=1)
        reminder = Reminder.objects.create(
            action=self.action,
            remind_at=past_time,
            message="Custom reminder message"
        )
        
        # Run the task
        result = check_due_reminders()
        
        # Verify notification was created
        self.assertEqual(Notification.objects.count(), 1)
        notification = Notification.objects.first()
        self.assertIn("Complete the task", notification.title)
        self.assertEqual(notification.message, "Custom reminder message")
        self.assertEqual(notification.notification_type, "reminder")
        self.assertEqual(notification.action, self.action)
        
        # Verify reminder marked as sent
        reminder.refresh_from_db()
        self.assertTrue(reminder.is_sent)
        
        # Verify result message
        self.assertIn("1", result)
    
    @patch("plexus.signals.process_input.delay")
    def test_future_reminder_not_processed(self, mock_signal_delay):
        """Test that a future reminder is not processed."""
        future_time = timezone.now() + timedelta(hours=1)
        Reminder.objects.create(
            action=self.action,
            remind_at=future_time
        )
        
        result = check_due_reminders()
        
        # Verify no notification created
        self.assertEqual(Notification.objects.count(), 0)
        self.assertIn("0", result)
    
    @patch("plexus.signals.process_input.delay")
    def test_already_sent_reminder_not_processed(self, mock_signal_delay):
        """Test that an already-sent reminder is not processed again (idempotency)."""
        past_time = timezone.now() - timedelta(hours=1)
        Reminder.objects.create(
            action=self.action,
            remind_at=past_time,
            is_sent=True  # Already sent
        )
        
        result = check_due_reminders()
        
        # Verify no new notification created
        self.assertEqual(Notification.objects.count(), 0)
        self.assertIn("0", result)
    
    @patch("plexus.signals.process_input.delay")
    def test_reminder_uses_action_description_as_default_message(self, mock_signal_delay):
        """Test that reminder uses action description when no custom message."""
        past_time = timezone.now() - timedelta(hours=1)
        Reminder.objects.create(
            action=self.action,
            remind_at=past_time
            # No message set
        )
        
        check_due_reminders()
        
        notification = Notification.objects.first()
        self.assertEqual(notification.message, "Complete the task")



@override_settings(MIDDLEWARE=TEST_MIDDLEWARE)
class ReminderAPITest(TestCase):
    """Tests for the Reminder API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        from django.contrib.auth.models import User
        from rest_framework.test import APIClient
        
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        
        self.input = Input.objects.create(content="Test input", source="web")
        self.thought = Thought.objects.create(
            input=self.input,
            content="Test thought",
            type="task",
            confidence_score=0.9,
            ai_model="test"
        )
        self.action = Action.objects.create(
            thought=self.thought,
            description="Test action",
            status="pending"
        )
    
    def test_create_reminder_via_api(self):
        """Test creating a reminder via the API."""
        from django.urls import reverse
        remind_at = (timezone.now() + timedelta(hours=1)).isoformat()
        # Use IP address host to bypass subdomain middleware redirect
        response = self.client.post(
            reverse("plexus:reminder-list"),
            data={
                "action": self.action.id,
                "remind_at": remind_at,
                "message": "API test reminder"
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Reminder.objects.count(), 1)
    
    def test_list_reminders_via_api(self):
        """Test listing reminders via the API."""
        from django.urls import reverse
        Reminder.objects.create(
            action=self.action,
            remind_at=timezone.now() + timedelta(hours=1)
        )
        
        response = self.client.get(reverse("plexus:reminder-list"))
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)


@override_settings(MIDDLEWARE=TEST_MIDDLEWARE)
class NotificationAPITest(TestCase):
    """Tests for the Notification API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        from django.contrib.auth.models import User
        from rest_framework.test import APIClient
        
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
    
    def test_list_notifications_via_api(self):
        """Test listing notifications via the API."""
        from django.urls import reverse
        Notification.objects.create(
            title="Test Notification",
            message="Test message",
            notification_type="system"
        )
        
        response = self.client.get(reverse("plexus:notification-list"))
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)
    
    def test_mark_all_read_via_api(self):
        """Test marking all notifications as read via the API."""
        from django.urls import reverse
        Notification.objects.create(
            title="Notification 1",
            message="Message 1",
            notification_type="system",
            is_read=False
        )
        Notification.objects.create(
            title="Notification 2",
            message="Message 2",
            notification_type="reminder",
            is_read=False
        )
        
        response = self.client.post(reverse("plexus:notification-mark-all-read"))
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["marked_read"], 2)
        
        # Verify all are now read
        self.assertEqual(Notification.objects.filter(is_read=False).count(), 0)

