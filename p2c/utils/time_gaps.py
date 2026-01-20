"""Utility functions for detecting time gaps between appointments."""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


def parse_time(time_str: str) -> Optional[datetime]:
    """
    Parse a time string in format "HH:MM" to a datetime object.

    Args:
        time_str: Time string in format "HH:MM"

    Returns:
        datetime object or None if parsing fails
    """
    if not time_str:
        return None

    try:
        parts = time_str.split(":")
        if len(parts) != 2:
            return None

        hours = int(parts[0])
        minutes = int(parts[1])

        # Use a dummy date for time comparison
        return datetime(2024, 1, 1, hours, minutes)
    except (ValueError, AttributeError):
        return None


def calculate_time_gap(end_time: str, start_time: str) -> Optional[int]:
    """
    Calculate the gap in minutes between the end of one appointment and the start of another.

    Args:
        end_time: End time of the first appointment in format "HH:MM"
        start_time: Start time of the second appointment in format "HH:MM"

    Returns:
        Gap in minutes, or None if times cannot be parsed
    """
    end_dt = parse_time(end_time)
    start_dt = parse_time(start_time)

    if not end_dt or not start_dt:
        return None

    gap = start_dt - end_dt
    return int(gap.total_seconds() / 60)


def find_time_gap_warnings(
    appointments: List[Dict], threshold_minutes: int = 30
) -> List[Dict]:
    """
    Find appointments with less than the threshold time gap between them.

    Args:
        appointments: List of appointment dictionaries with 'day', 'start_time', 'end_time', and 'description'
        threshold_minutes: Minimum gap in minutes between appointments (default: 30)

    Returns:
        List of warning dictionaries containing information about appointments with short gaps
    """
    warnings = []

    # Filter out breaks/pauses
    filtered_appointments = []
    for apt in appointments:
        description = apt.get("description", "").lower()
        if not any(
            word in description for word in ["pause", "repas", "temps de pause repas"]
        ):
            filtered_appointments.append(apt)

    # Sort appointments by day and start time
    sorted_appointments = sorted(
        filtered_appointments,
        key=lambda x: (
            int(x.get("day", 0)),
            parse_time(x.get("start_time", "00:00")) or datetime.min,
        ),
    )

    # Check for gaps between consecutive appointments
    for i in range(len(sorted_appointments) - 1):
        current_apt = sorted_appointments[i]
        next_apt = sorted_appointments[i + 1]

        # Only check appointments on the same day
        if current_apt.get("day") == next_apt.get("day"):
            gap_minutes = calculate_time_gap(
                current_apt.get("end_time", ""), next_apt.get("start_time", "")
            )

            if gap_minutes is not None and 0 <= gap_minutes < threshold_minutes:
                warning = {
                    "first_appointment": {
                        "description": current_apt.get("description", ""),
                        "day": current_apt.get("day"),
                        "end_time": current_apt.get("end_time", ""),
                    },
                    "second_appointment": {
                        "description": next_apt.get("description", ""),
                        "day": next_apt.get("day"),
                        "start_time": next_apt.get("start_time", ""),
                    },
                    "gap_minutes": gap_minutes,
                    "warning_message": f"Only {gap_minutes} minute{'s' if gap_minutes != 1 else ''} between appointments",
                }
                warnings.append(warning)

    return warnings


def add_gap_warnings_to_appointments(
    appointments: List[Dict],
) -> Tuple[List[Dict], List[Dict]]:
    """
    Add warning flags to appointments that have short gaps and return warnings list.

    Args:
        appointments: List of appointment dictionaries

    Returns:
        Tuple of (modified appointments list, warnings list)
    """
    warnings = find_time_gap_warnings(appointments)

    # Create a set of appointments that have warnings
    warned_appointments = set()
    for warning in warnings:
        first_desc = warning["first_appointment"]["description"]
        second_desc = warning["second_appointment"]["description"]
        first_day = warning["first_appointment"]["day"]
        second_day = warning["second_appointment"]["day"]

        warned_appointments.add((first_desc, first_day))
        warned_appointments.add((second_desc, second_day))

    # Add warning flags to appointments
    for apt in appointments:
        apt_key = (apt.get("description", ""), apt.get("day"))
        apt["has_gap_warning"] = apt_key in warned_appointments

    return appointments, warnings
