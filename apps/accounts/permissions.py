from django.utils import timezone
from rest_framework.permissions import BasePermission

from apps.accounts.api_keys import APIKey


class HasAPIKey(BasePermission):
    """Require a valid API key in the X-API-Key header."""

    def has_permission(self, request, view):
        raw_key = request.META.get('HTTP_X_API_KEY', '')
        if not raw_key:
            return False

        hashed = APIKey.hash_key(raw_key)
        try:
            api_key = APIKey.objects.select_related('owner').get(key=hashed, is_active=True)
        except APIKey.DoesNotExist:
            return False

        # Check expiry
        if api_key.expires_at and api_key.expires_at < timezone.now():
            return False

        # Stamp last_used_at
        APIKey.objects.filter(pk=api_key.pk).update(last_used_at=timezone.now())

        # Attach to request for downstream use (throttling, etc.)
        request.api_key = api_key
        return True


class HasAPIKeyOrIsAuthenticated(BasePermission):
    """Allow access with either a valid API key or JWT/session auth."""

    def has_permission(self, request, view):
        # Try API key first
        raw_key = request.META.get('HTTP_X_API_KEY', '')
        if raw_key:
            hashed = APIKey.hash_key(raw_key)
            try:
                api_key = APIKey.objects.select_related('owner').get(key=hashed, is_active=True)
            except APIKey.DoesNotExist:
                return False

            if api_key.expires_at and api_key.expires_at < timezone.now():
                return False

            APIKey.objects.filter(pk=api_key.pk).update(last_used_at=timezone.now())
            request.api_key = api_key
            return True

        # Fall back to normal authentication
        return request.user and request.user.is_authenticated
