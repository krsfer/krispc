"""Utilities for calendar backup functionality."""
import json
import os
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


def generate_backup_file(user_id, calendar_id, calendar_name, month, year, events):
    """
    Generate a JSON backup file for calendar events.

    Args:
        user_id: ID of the user
        calendar_id: Google Calendar ID
        calendar_name: Name of the calendar
        month: Month (1-12)
        year: Year
        events: List of event dictionaries from Google Calendar API

    Returns:
        str: Relative path to the saved backup file
    """
    # Create backup data structure
    backup_data = {
        "backup_metadata": {
            "user_id": user_id,
            "calendar_id": calendar_id,
            "calendar_name": calendar_name,
            "month": month,
            "year": year,
            "backup_date": datetime.now().isoformat(),
            "event_count": len(events)
        },
        "events": events
    }

    # Generate filename: backups/{user_id}/{year}/{month}/backup_{timestamp}.json
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backups/{user_id}/{year}/{month:02d}/backup_{timestamp}.json"

    # Convert to JSON string
    json_content = json.dumps(backup_data, indent=2, ensure_ascii=False)

    # Save using Django's storage system
    path = default_storage.save(filename, ContentFile(json_content.encode('utf-8')))

    return path


def read_backup_file(file_path):
    """
    Read and parse a backup JSON file.

    Args:
        file_path: Relative path to the backup file

    Returns:
        dict: Parsed backup data with 'backup_metadata' and 'events' keys
    """
    if not default_storage.exists(file_path):
        raise FileNotFoundError(f"Backup file not found: {file_path}")

    with default_storage.open(file_path, 'r') as f:
        return json.load(f)


def delete_backup_file(file_path):
    """
    Delete a backup JSON file.

    Args:
        file_path: Relative path to the backup file

    Returns:
        bool: True if deleted, False if file didn't exist
    """
    if default_storage.exists(file_path):
        default_storage.delete(file_path)
        return True
    return False
