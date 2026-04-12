"""Helpers for estimating monthly travel distance between appointments."""

from __future__ import annotations

import math
import re
from collections import defaultdict
from typing import Any, Callable

import requests

from p2c.config.event_settings import get_event_settings_for_name

BREAK_KEYWORDS = ("temps de pause repas", "pause", "repas")
LOCATION_SPLIT_RE = re.compile(r"\s[-–‐]\s")
WHITESPACE_RE = re.compile(r"\s+")


def is_break_appointment(description: str) -> bool:
    """Return True when the appointment is a break/pause entry."""
    normalized = (description or "").casefold()
    return any(keyword in normalized for keyword in BREAK_KEYWORDS)


def _clean_location(value: str) -> str:
    """Normalize location text for geocoding/cache keys."""
    if not value:
        return ""
    cleaned = WHITESPACE_RE.sub(" ", str(value)).strip()
    cleaned = cleaned.removesuffix(", France").strip()
    return cleaned


def _location_candidates(location: str) -> list[str]:
    """Return progressively simplified geocoding queries."""
    cleaned = _clean_location(location)
    if not cleaned:
        return []

    candidates = [cleaned]
    stripped = LOCATION_SPLIT_RE.split(cleaned, maxsplit=1)[0].strip()
    if stripped and stripped not in candidates:
        candidates.append(stripped)

    if not cleaned.endswith("France"):
        france_candidate = f"{stripped or cleaned}, France"
        if france_candidate not in candidates:
            candidates.append(france_candidate)

    return candidates


def geocode_location(location: str) -> tuple[float, float] | None:
    """Geocode a location with Nominatim.

    Returns latitude/longitude or None when the location cannot be resolved.
    """
    for candidate in _location_candidates(location):
        try:
            response = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": candidate, "format": "jsonv2", "limit": 1},
                headers={"User-Agent": "krispc-pdf2cal/1.0"},
                timeout=5,
            )
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError):
            continue

        if not payload:
            continue

        result = payload[0]
        try:
            return float(result["lat"]), float(result["lon"])
        except (KeyError, TypeError, ValueError):
            continue

    return None


def geocode_location_with_mapbox(
    location: str,
    access_token: str,
) -> tuple[float, float] | None:
    """Geocode a location with Mapbox Search Geocoding v6."""
    if not access_token:
        return None

    for candidate in _location_candidates(location):
        try:
            response = requests.get(
                "https://api.mapbox.com/search/geocode/v6/forward",
                params={
                    "q": candidate,
                    "access_token": access_token,
                    "autocomplete": "false",
                    "limit": 1,
                    "language": "fr",
                    "format": "geojson",
                },
                timeout=5,
            )
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError):
            continue

        features = payload.get("features") or []
        if not features:
            continue

        geometry = features[0].get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        if len(coordinates) < 2:
            continue

        try:
            longitude, latitude = coordinates[:2]
            return float(latitude), float(longitude)
        except (TypeError, ValueError):
            continue

    return None


def _haversine_km(start: tuple[float, float], end: tuple[float, float]) -> float:
    """Return great-circle distance between two coordinates in kilometers."""
    start_lat, start_lon = start
    end_lat, end_lon = end

    radius_km = 6371.0
    d_lat = math.radians(end_lat - start_lat)
    d_lon = math.radians(end_lon - start_lon)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(start_lat))
        * math.cos(math.radians(end_lat))
        * math.sin(d_lon / 2) ** 2
    )
    return radius_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def route_distance_km_with_mapbox(
    start: tuple[float, float],
    end: tuple[float, float],
    access_token: str,
) -> float | None:
    """Route two coordinates with Mapbox Directions and return distance in km."""
    if not access_token:
        return None

    start_lat, start_lon = start
    end_lat, end_lon = end
    coordinates = f"{start_lon},{start_lat};{end_lon},{end_lat}"

    try:
        response = requests.get(
            f"https://api.mapbox.com/directions/v5/mapbox/driving/{coordinates}",
            params={
                "access_token": access_token,
                "alternatives": "false",
                "overview": "false",
            },
            timeout=5,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError):
        return None

    routes = payload.get("routes") or []
    if payload.get("code") != "Ok" or not routes:
        return None

    try:
        return float(routes[0]["distance"]) / 1000
    except (KeyError, TypeError, ValueError):
        return None


def _time_to_minutes(value: str) -> int:
    """Parse HH:MM to absolute minutes since midnight."""
    hours, minutes = map(int, str(value).split(":", 1))
    return hours * 60 + minutes


def _resolve_location(
    appointment: dict[str, Any],
    event_settings: dict[str, dict[str, Any]] | None,
) -> str:
    """Resolve the best location available for an appointment."""
    explicit_location = _clean_location(appointment.get("location", ""))
    if explicit_location and explicit_location.lower() not in {"no location", "not found"}:
        return explicit_location

    name = (
        appointment.get("normalized_name")
        or appointment.get("description")
        or ""
    ).strip()
    if not name or not event_settings:
        return ""

    settings = get_event_settings_for_name(name, event_settings)
    inferred_location = _clean_location(settings.get("location", ""))
    if inferred_location.lower() in {"no location", "not found"}:
        return ""
    return inferred_location


def compute_monthly_travel_summary(
    appointments: list[dict[str, Any]] | None,
    *,
    event_settings: dict[str, dict[str, Any]] | None = None,
    base_location: str | None = None,
    mapbox_access_token: str | None = None,
    geocode_func: Callable[[str], tuple[float, float] | None] | None = None,
    route_distance_func: Callable[[tuple[float, float], tuple[float, float]], float | None] | None = None,
) -> dict[str, Any]:
    """Estimate the month's travel distance from appointment locations.

    The default model is a round-trip per appointment:
    home -> appointment -> home, repeated for each valid appointment.
    """
    grouped_by_day: dict[tuple[int, int, int], list[dict[str, Any]]] = defaultdict(list)
    missing_location_count = 0

    for appointment in appointments or []:
        if is_break_appointment(appointment.get("description", "")):
            continue

        year = appointment.get("year")
        month = appointment.get("month")
        day = appointment.get("day")
        start_time = appointment.get("start_time")

        if not all([year, month, day, start_time]):
            continue

        resolved_location = _resolve_location(appointment, event_settings)
        if not resolved_location:
            missing_location_count += 1

        grouped_by_day[(year, month, day)].append(
            {
                **appointment,
                "resolved_location": resolved_location,
                "sort_minutes": _time_to_minutes(start_time),
            }
        )

    geocode_cache: dict[str, dict[str, Any]] = {}
    route_cache: dict[tuple[tuple[float, float], tuple[float, float]], dict[str, Any]] = {}
    used_mapbox_routing = False
    trip_details: list[dict[str, Any]] = []

    def resolve_coords(location: str) -> dict[str, Any]:
        if not location:
            return {"coords": None, "source": "missing"}
        if location not in geocode_cache:
            if geocode_func is not None:
                geocode_cache[location] = {
                    "coords": geocode_func(location),
                    "source": "custom",
                }
            elif mapbox_access_token:
                mapbox_coords = geocode_location_with_mapbox(
                    location,
                    mapbox_access_token,
                )
                if mapbox_coords is not None:
                    geocode_cache[location] = {
                        "coords": mapbox_coords,
                        "source": "mapbox",
                    }
                else:
                    geocode_cache[location] = {
                        "coords": geocode_location(location),
                        "source": "nominatim",
                    }
            else:
                geocode_cache[location] = {
                    "coords": geocode_location(location),
                    "source": "nominatim",
                }
        return geocode_cache[location]

    def resolve_route_distance(
        start: tuple[float, float],
        end: tuple[float, float],
    ) -> dict[str, Any]:
        nonlocal used_mapbox_routing
        cache_key = (start, end)
        if cache_key not in route_cache:
            if route_distance_func is not None:
                route_cache[cache_key] = {
                    "distance_km": route_distance_func(start, end),
                    "source": "custom",
                }
            elif mapbox_access_token:
                mapbox_distance = route_distance_km_with_mapbox(
                    start,
                    end,
                    mapbox_access_token,
                )
                if mapbox_distance is not None:
                    used_mapbox_routing = True
                    route_cache[cache_key] = {
                        "distance_km": mapbox_distance,
                        "source": "mapbox",
                    }
                else:
                    route_cache[cache_key] = {
                        "distance_km": _haversine_km(start, end),
                        "source": "geodesic",
                    }
            else:
                route_cache[cache_key] = {
                    "distance_km": _haversine_km(start, end),
                    "source": "geodesic",
                }
        return route_cache[cache_key]

    cleaned_base_location = _clean_location(base_location or "")
    base_resolution = (
        resolve_coords(cleaned_base_location)
        if cleaned_base_location
        else {"coords": None, "source": "missing"}
    )
    base_coords = base_resolution["coords"]

    total_distance_km = 0.0
    leg_count = 0
    skipped_leg_count = 0

    def add_leg(origin: str, destination: str) -> None:
        nonlocal total_distance_km, leg_count, skipped_leg_count
        if not origin or not destination:
            skipped_leg_count += 1
            return

        origin_coords = resolve_coords(origin)["coords"]
        destination_coords = resolve_coords(destination)["coords"]
        if not origin_coords or not destination_coords:
            skipped_leg_count += 1
            return

        distance_km = resolve_route_distance(origin_coords, destination_coords)["distance_km"]
        if distance_km is None:
            skipped_leg_count += 1
            return

        total_distance_km += distance_km
        if distance_km > 0:
            leg_count += 1

    for day_key in sorted(grouped_by_day.keys()):
        day_appointments = sorted(
            grouped_by_day[day_key],
            key=lambda item: (item["sort_minutes"], item.get("end_time", "")),
        )
        for appointment in day_appointments:
            destination = appointment["resolved_location"]
            if not base_coords or not destination:
                skipped_leg_count += 2
                trip_details.append(
                    {
                        "year": appointment.get("year"),
                        "month": appointment.get("month"),
                        "day": appointment.get("day"),
                        "start_time": appointment.get("start_time", ""),
                        "end_time": appointment.get("end_time", ""),
                        "description": appointment.get("description", ""),
                        "destination": destination,
                        "outbound_km": None,
                        "return_km": None,
                        "total_km": None,
                        "fallback_used": True,
                        "route_source": "unavailable",
                    }
                )
                continue

            destination_resolution = resolve_coords(destination)
            outbound_route = resolve_route_distance(
                base_coords,
                destination_resolution["coords"],
            )
            return_route = resolve_route_distance(
                destination_resolution["coords"],
                base_coords,
            )

            add_leg(cleaned_base_location, destination)
            add_leg(destination, cleaned_base_location)
            fallback_used = any(
                source not in {"mapbox", "custom"}
                for source in (
                    base_resolution["source"],
                    destination_resolution["source"],
                    outbound_route["source"],
                    return_route["source"],
                )
            )
            trip_details.append(
                {
                    "year": appointment.get("year"),
                    "month": appointment.get("month"),
                    "day": appointment.get("day"),
                    "start_time": appointment.get("start_time", ""),
                    "end_time": appointment.get("end_time", ""),
                    "description": appointment.get("description", ""),
                    "destination": destination,
                    "outbound_km": round(outbound_route["distance_km"], 1)
                    if outbound_route["distance_km"] is not None
                    else None,
                    "return_km": round(return_route["distance_km"], 1)
                    if return_route["distance_km"] is not None
                    else None,
                    "total_km": round(
                        (outbound_route["distance_km"] or 0)
                        + (return_route["distance_km"] or 0),
                        1,
                    )
                    if outbound_route["distance_km"] is not None
                    and return_route["distance_km"] is not None
                    else None,
                    "fallback_used": fallback_used,
                    "route_source": outbound_route["source"]
                    if outbound_route["source"] == return_route["source"]
                    else f'{outbound_route["source"]}/{return_route["source"]}',
                }
            )

    has_distance = leg_count > 0 or total_distance_km > 0
    return {
        "has_distance": has_distance,
        "total_distance_km": round(total_distance_km, 1) if has_distance else None,
        "leg_count": leg_count,
        "appointment_count": sum(len(items) for items in grouped_by_day.values()),
        "missing_location_count": missing_location_count,
        "skipped_leg_count": skipped_leg_count,
        "used_base_location": bool(base_coords),
        "base_location": cleaned_base_location if base_coords else "",
        "distance_source": "mapbox" if used_mapbox_routing else "geodesic",
        "algorithm": "round_trip_per_appointment",
        "trip_details": trip_details,
        "fallback_used": any(item.get("fallback_used") for item in trip_details),
    }
