from django import template

register = template.Library()


@register.filter
def minutes_to_hhmm(minutes):
    """Convert minutes to HH:MM format."""
    if not minutes:
        return ""
    try:
        minutes = int(minutes)
        hours = minutes // 60
        remaining_minutes = minutes % 60
        return f"{hours:02d}:{remaining_minutes:02d}"
    except (ValueError, TypeError):
        return ""
