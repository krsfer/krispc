from django.test import TestCase
from django.contrib.admin.sites import AdminSite
from plexus.models import Input, Thought, Action
from plexus.admin import InputAdmin, ThoughtAdmin, ActionAdmin

class MockRequest:
    pass

class AdminTest(TestCase):
    def setUp(self):
        self.site = AdminSite()

    def test_input_admin(self):
        model_admin = InputAdmin(Input, self.site)
        # Check list display includes expected fields
        self.assertIn("content_preview", model_admin.list_display)
        self.assertIn("source", model_admin.list_display)

    def test_thought_admin(self):
        model_admin = ThoughtAdmin(Thought, self.site)
        self.assertIn("type", model_admin.list_display)
        self.assertIn("confidence_score", model_admin.list_display)

    def test_action_admin(self):
        model_admin = ActionAdmin(Action, self.site)
        self.assertIn("status", model_admin.list_display)
