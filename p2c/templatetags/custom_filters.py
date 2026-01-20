import hashlib
from datetime import datetime, timedelta

from django import template

register = template.Library()


@register.filter
def md5_hash(value):
    """Convert a string to its MD5 hash."""
    return hashlib.md5(str(value).lower().encode("utf-8")).hexdigest()


@register.filter
def minutes_to_hhmm(value):
    """Convert minutes to HH:MM format."""
    if not value:
        return ""
    hours = int(value) // 60
    minutes = int(value) % 60
    return f"{hours:02d}:{minutes:02d}"


@register.filter
def split(value, arg):
    """Split a string by the given separator"""
    return value.split(arg)


@register.filter
def trim(value):
    """Trim whitespace from a string"""
    return value.strip()


@register.filter
def is_weekend(day, month_year=None):
    """
    Determine if a given day falls on a weekend, using the month and year context
    month_year format: "YYYY-MM"
    """
    try:
        if not month_year:
            return False
        year, month = month_year.split("-")
        date = datetime(int(year), int(month), int(day))
        return date.weekday() >= 5  # 5 = Saturday, 6 = Sunday
    except (ValueError, AttributeError):
        return False
