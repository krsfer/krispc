from .models import PlanningSnapshot

def unread_updates_context(request):
    # Check if user exists and is authenticated
    # request.user can be None when UNAUTHENTICATED_USER = None in DRF settings
    if request.user and request.user.is_authenticated:
        has_unread_updates = PlanningSnapshot.objects.filter(user=request.user, read=False).exists()
        return {'has_unread_updates': has_unread_updates}
    return {'has_unread_updates': False}
