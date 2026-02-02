import pytest
from django.template.loader import render_to_string
from django.contrib.auth.models import User
from plexus.models import Thought, Input, Action
from django.utils import translation

@pytest.mark.django_db
class TestDashboardAccordion:
    def setup_method(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.input_obj = Input.objects.create(content="Test input", user=self.user, source="web")
        self.thought = Thought.objects.create(
            input=self.input_obj,
            content="Test Thought",
            type="task",
            confidence_score=0.95,
        )
        self.action = Action.objects.create(
            thought=self.thought,
            description="Test Action",
            status="pending"
        )

    def test_actions_section_has_accordion_classes(self):
        """
        Verify that the actions section in dashboard has accordion classes/attributes.
        """
        context = {
            "thoughts": [self.thought],
            "user": self.user,
            "request": type('Request', (object,), {'GET': {}, 'user': self.user})(),
        }

        with translation.override("en"):
            rendered_html = render_to_string("plexus/dashboard.html", context)

        # This should fail initially because we haven't added these yet
        # We'll look for standard accordion-like markers or specific classes we intend to use
        assert 'id="accordion-actions-' in rendered_html
        assert 'aria-expanded=' in rendered_html
        assert 'data-accordion-target=' in rendered_html or 'details' in rendered_html

    def test_action_center_has_accordion_structure(self):
        """
        Verify that the action center uses accordions for actions.
        """
        context = {
            "actions": [self.action],
            "current_status": "pending",
            "user": self.user,
            "request": type('Request', (object,), {'GET': {}, 'user': self.user})(),
        }

        with translation.override("en"):
            rendered_html = render_to_string("plexus/action_center.html", context)

        # This should also fail initially
        assert 'id="accordion-action-center"' in rendered_html or 'class="accordion"' in rendered_html
