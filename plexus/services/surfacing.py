from django.utils import timezone
from django.db.models.functions import ExtractMonth, ExtractDay
from plexus.models import Thought
import random

def get_on_this_day():
    """
    Returns thoughts created on this same day and month in previous years.
    """
    today = timezone.now()
    
    # Filter by month and day, excluding the current year
    on_this_day = Thought.objects.annotate(
        month=ExtractMonth('input__timestamp'),
        day=ExtractDay('input__timestamp')
    ).filter(
        month=today.month,
        day=today.day
    ).exclude(
        input__timestamp__year=today.year
    ).order_by('-input__timestamp')
    
    return on_this_day

def get_random_resurface():
    """
    Returns a single random thought created more than 30 days ago.
    """
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    
    # Get IDs of older thoughts
    pks = Thought.objects.filter(
        input__timestamp__lt=thirty_days_ago
    ).values_list('pk', flat=True)
    
    if not pks:
        return None
        
    random_pk = random.choice(pks)
    return Thought.objects.get(pk=random_pk)
