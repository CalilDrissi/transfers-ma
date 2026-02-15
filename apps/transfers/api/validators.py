import re
from django.utils import timezone
from rest_framework.exceptions import ValidationError


def validate_phone(value):
    """Validate phone number format."""
    if not re.match(r'^\+?[\d\s\-()]{7,20}$', value):
        raise ValidationError('Invalid phone number format.')
    return value


def validate_future_datetime(value):
    """Ensure the datetime is in the future."""
    if value <= timezone.now():
        raise ValidationError('Datetime must be in the future.')
    return value


def validate_latitude(value):
    """Validate latitude is between -90 and 90."""
    val = float(value)
    if val < -90 or val > 90:
        raise ValidationError('Latitude must be between -90 and 90.')
    return value


def validate_longitude(value):
    """Validate longitude is between -180 and 180."""
    val = float(value)
    if val < -180 or val > 180:
        raise ValidationError('Longitude must be between -180 and 180.')
    return value
