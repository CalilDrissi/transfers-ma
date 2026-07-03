"""
Distance calculation services using Google Distance Matrix API.
"""
import logging
from decimal import Decimal
from math import radians, sin, cos, sqrt, atan2

import requests

from apps.accounts.models import SiteSettings

logger = logging.getLogger(__name__)


class DistanceCalculationError(Exception):
    """Raised when distance calculation fails."""
    pass


def get_google_api_key():
    """Get the Google Maps API key from settings."""
    settings = SiteSettings.get_settings()
    return settings.google_maps_api_key


def calculate_distance_google(origin_lat, origin_lng, dest_lat, dest_lng):
    """
    Calculate driving distance and duration using Google Distance Matrix API.

    Args:
        origin_lat: Origin latitude
        origin_lng: Origin longitude
        dest_lat: Destination latitude
        dest_lng: Destination longitude

    Returns:
        dict: {
            'distance_km': Decimal,
            'distance_text': str,
            'duration_minutes': int,
            'duration_text': str
        }

    Raises:
        DistanceCalculationError: If the API call fails
    """
    api_key = get_google_api_key()

    if not api_key:
        raise DistanceCalculationError("Google Maps API key not configured")

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"

    params = {
        'origins': f"{origin_lat},{origin_lng}",
        'destinations': f"{dest_lat},{dest_lng}",
        'mode': 'driving',
        'units': 'metric',
        'key': api_key
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data['status'] != 'OK':
            raise DistanceCalculationError(f"Google API error: {data['status']}")

        element = data['rows'][0]['elements'][0]

        if element['status'] != 'OK':
            raise DistanceCalculationError(f"Route not found: {element['status']}")

        distance_meters = element['distance']['value']
        distance_km = Decimal(str(distance_meters / 1000)).quantize(Decimal('0.01'))

        duration_seconds = element['duration']['value']
        duration_minutes = int(duration_seconds / 60)

        return {
            'distance_km': distance_km,
            'distance_text': element['distance']['text'],
            'duration_minutes': duration_minutes,
            'duration_text': element['duration']['text']
        }

    except requests.RequestException as e:
        logger.error(f"Google Distance Matrix API request failed: {e}")
        raise DistanceCalculationError(f"API request failed: {e}")
    except (KeyError, IndexError) as e:
        logger.error(f"Unexpected API response format: {e}")
        raise DistanceCalculationError(f"Invalid API response: {e}")


def calculate_distance_haversine(lat1, lng1, lat2, lng2):
    """
    Calculate straight-line distance using Haversine formula.
    This is a fallback when Google API is not available.

    Args:
        lat1, lng1: Origin coordinates
        lat2, lng2: Destination coordinates

    Returns:
        Decimal: Distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers

    lat1, lng1, lat2, lng2 = map(radians, [float(lat1), float(lng1), float(lat2), float(lng2)])

    dlat = lat2 - lat1
    dlng = lng2 - lng1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return Decimal(str(distance)).quantize(Decimal('0.01'))


def calculate_distance(origin_lat, origin_lng, dest_lat, dest_lng):
    """
    Calculate driving distance and duration using Google Distance Matrix API.

    Raises DistanceCalculationError if the API call fails — callers should
    catch this and fall back to haversine_distance() for straight-line estimates.

    Returns:
        dict with keys: distance_km, distance_text, duration_minutes, duration_text, source
    """
    result = calculate_distance_google(origin_lat, origin_lng, dest_lat, dest_lng)
    result['source'] = 'google'
    return result


