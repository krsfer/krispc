import pytest
from django.template.loader import render_to_string
from django.contrib.auth.models import User
from plexus.models import Thought, Input
from django.utils import translation

@pytest.mark.django_db
def test_confidence_score_rendering():
    """
    Test that the confidence score is rendered correctly and not as raw template tags.
    """
    # Setup
    user = User.objects.create_user(username="testuser", password="password")
    input_obj = Input.objects.create(content="Test input", user=user, source="web")
    thought = Thought.objects.create(
        input=input_obj,
        content="Test Thought",
        type="ideation",
        confidence_score=0.954321,  # Should format to 0.95
    )

    context = {
        "thoughts": [thought],
        "user": user,
        "request": type('Request', (object,), {'GET': {}, 'user': user})(), # Mock request
    }

    # Render
    with translation.override("en"):
        rendered_html = render_to_string("plexus/dashboard.html", context)

    # Verification
    # 1. Should contain the formatted score
    assert "0.95" in rendered_html
    
    # 2. Should NOT contain raw template tags associated with confidence
    assert "{{ thought.confidence_score" not in rendered_html
    assert "{{ score }}" not in rendered_html
    
    # 3. Specific check for the user reported issue "Confiance: {{ ... }}"
    # We check for the raw variable syntax in the output
    assert "Confidence: {{" not in rendered_html
