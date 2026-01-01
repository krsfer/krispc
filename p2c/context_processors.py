from .models import PlanningSnapshot

def unread_updates_context(request):
    if request.user.is_authenticated:
        has_unread_updates = PlanningSnapshot.objects.filter(user=request.user, read=False).exists()
        return {'has_unread_updates': has_unread_updates}
    return {'has_unread_updates': False}
