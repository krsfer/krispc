from p2c.utils.travel_distance import compute_monthly_travel_summary


def test_compute_monthly_travel_summary_uses_round_trip_home_for_each_appointment():
    appointments = [
        {
            "description": "Alpha",
            "normalized_name": "Alpha",
            "location": "A",
            "day": 1,
            "month": 1,
            "year": 2024,
            "start_time": "08:00",
            "end_time": "09:00",
        },
        {
            "description": "Bravo",
            "normalized_name": "Bravo",
            "location": "B",
            "day": 1,
            "month": 1,
            "year": 2024,
            "start_time": "10:00",
            "end_time": "11:00",
        },
    ]
    coordinates = {
        "HOME": (43.69, 7.01),
        "A": (43.7, 7.0),
        "B": (43.71, 7.05),
    }
    route_distances = {
        ((43.69, 7.01), (43.7, 7.0)): 3.2,
        ((43.7, 7.0), (43.69, 7.01)): 3.4,
        ((43.69, 7.01), (43.71, 7.05)): 8.9,
        ((43.71, 7.05), (43.69, 7.01)): 9.1,
    }

    summary = compute_monthly_travel_summary(
        appointments,
        base_location="HOME",
        geocode_func=coordinates.get,
        route_distance_func=lambda start, end: route_distances[(start, end)],
    )

    assert summary["algorithm"] == "round_trip_per_appointment"
    assert summary["used_base_location"] is True
    assert summary["leg_count"] == 4
    assert summary["total_distance_km"] == 24.6
    assert len(summary["trip_details"]) == 2
    assert summary["trip_details"][0]["fallback_used"] is False


def test_compute_monthly_travel_summary_uses_fallback_beneficiary_location_and_skips_missing():
    appointments = [
        {
            "description": "Carol",
            "normalized_name": "Carol",
            "location": "",
            "day": 1,
            "month": 1,
            "year": 2024,
            "start_time": "08:00",
            "end_time": "09:00",
        },
        {
            "description": "Temps de pause repas",
            "location": "ignored",
            "day": 1,
            "month": 1,
            "year": 2024,
            "start_time": "12:00",
            "end_time": "13:00",
        },
        {
            "description": "No address yet",
            "normalized_name": "Unknown",
            "location": "",
            "day": 2,
            "month": 1,
            "year": 2024,
            "start_time": "09:00",
            "end_time": "10:00",
        },
    ]
    event_settings = {
        "DEFAULT": {"location": ""},
        "Carol": {"location": "C"},
    }
    coordinates = {
        "HOME": (43.69, 7.01),
        "C": (43.75, 7.08),
    }

    summary = compute_monthly_travel_summary(
        appointments,
        event_settings=event_settings,
        base_location="HOME",
        geocode_func=coordinates.get,
    )

    assert summary["appointment_count"] == 2
    assert summary["missing_location_count"] == 1
    assert summary["leg_count"] == 2
    assert summary["skipped_leg_count"] == 2
    assert summary["has_distance"] is True
    assert summary["fallback_used"] is True


def test_compute_monthly_travel_summary_requires_home_location_for_roundtrip():
    appointments = [
        {
            "description": "Alpha",
            "location": "A",
            "day": 1,
            "month": 1,
            "year": 2024,
            "start_time": "08:00",
            "end_time": "09:00",
        }
    ]
    coordinates = {"A": (43.7, 7.0)}

    summary = compute_monthly_travel_summary(
        appointments,
        geocode_func=coordinates.get,
    )

    assert summary["has_distance"] is False
    assert summary["used_base_location"] is False
    assert summary["skipped_leg_count"] == 2
    assert summary["trip_details"][0]["total_km"] is None
