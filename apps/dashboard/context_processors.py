from apps.accounts.models import SiteSettings


def google_maps(request):
    """Add Google Maps API key to template context."""
    try:
        site_settings = SiteSettings.get_settings()
        api_key = site_settings.google_maps_api_key or ''
    except Exception:
        api_key = ''
    return {
        'GOOGLE_MAPS_API_KEY': api_key,
    }


def site_settings(request):
    """Add site settings to template context."""
    try:
        settings = SiteSettings.get_settings()
        return {
            'CURRENCY': settings.default_currency or 'MAD',
            'COST_CURRENCY': settings.cost_currency or 'MAD',
            'SITE_NAME': settings.site_name or 'Transfers.ma',
        }
    except Exception:
        return {
            'CURRENCY': 'MAD',
            'COST_CURRENCY': 'MAD',
            'SITE_NAME': 'Transfers.ma',
        }
