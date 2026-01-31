"""
Guest login views for Plexus.
"""
from django.contrib.auth import login
from django.shortcuts import redirect
from django.views import View
from django.contrib import messages
from django.utils.translation import gettext_lazy as _

from .guest import create_guest_user, GUEST_THOUGHT_LIMIT


class GuestLoginView(View):
    """
    Handle guest login requests.
    Creates a new guest user and logs them in.
    """
    
    def post(self, request):
        guest_user = create_guest_user()
        login(request, guest_user)
        messages.info(
            request, 
            _("Welcome, Guest! You can create up to %(limit)s thoughts.") % {
                "limit": GUEST_THOUGHT_LIMIT
            }
        )
        return redirect("plexus:dashboard")
