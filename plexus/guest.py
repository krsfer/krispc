"""
Guest user utilities for Plexus.

Enables visitors to try Plexus without registration, limited to 4 Thoughts.
"""
import uuid
from django.contrib.auth import get_user_model
from .models import Input

User = get_user_model()

# Guest account constants
GUEST_THOUGHT_LIMIT = 10
GUEST_USERNAME_PREFIX = "guest_"


def create_guest_user():
    """
    Create a guest Django User with a unique username.
    The user is marked with a username prefix for identification.
    """
    username = f"{GUEST_USERNAME_PREFIX}{uuid.uuid4().hex[:12]}"
    user = User.objects.create_user(
        username=username,
        password=None,  # No password for guest users
        is_active=True,
    )
    return user


def is_guest_user(user):
    """
    Check if the given user is a guest user.
    Guest users have usernames starting with GUEST_USERNAME_PREFIX.
    """
    if user is None or not user.is_authenticated:
        return False
    return user.username.startswith(GUEST_USERNAME_PREFIX)


def get_guest_thought_count(user):
    """
    Get the number of Thoughts owned by a guest user.
    Counts Thoughts via the Input model's user FK.
    """
    if user is None or not user.is_authenticated:
        return 0
    from .models import Thought
    return Thought.objects.filter(input__user=user).count()


def can_create_thought(user):
    """
    Check if the user can create a new Thought.
    
    Returns:
        (bool, int): Tuple of (can_create, remaining_count)
    """
    if not is_guest_user(user):
        # Non-guest users have unlimited thoughts
        return True, -1
    
    current_count = get_guest_thought_count(user)
    remaining = GUEST_THOUGHT_LIMIT - current_count
    return remaining > 0, remaining


def get_guest_status(user):
    """
    Get detailed guest status for template context.
    
    Returns dict with:
        - is_guest: bool
        - thought_count: int
        - remaining: int
        - can_create: bool
        - limit: int
    """
    if not is_guest_user(user):
        return {
            "is_guest": False,
            "thought_count": 0,
            "remaining": -1,
            "can_create": True,
            "limit": 0,
        }
    
    count = get_guest_thought_count(user)
    remaining = GUEST_THOUGHT_LIMIT - count
    return {
        "is_guest": True,
        "thought_count": count,
        "remaining": remaining,
        "can_create": remaining > 0,
        "limit": GUEST_THOUGHT_LIMIT,
    }
