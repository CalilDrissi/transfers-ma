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
    ctx = {
        'CURRENCY': 'MAD',
        'COST_CURRENCY': 'MAD',
        'SITE_NAME': 'Transfers.ma',
    }
    try:
        settings = SiteSettings.get_settings()
        ctx['CURRENCY'] = settings.default_currency or 'MAD'
        ctx['COST_CURRENCY'] = settings.cost_currency or 'MAD'
        ctx['SITE_NAME'] = settings.site_name or 'Transfers.ma'
    except Exception:
        pass

    # Pending rental companies count for dashboard sidebar badge
    if request.path.startswith('/dashboard/') and hasattr(request, 'user') and request.user.is_authenticated:
        try:
            from apps.rental_companies.models import RentalCompany
            ctx['pending_rental_companies_count'] = RentalCompany.objects.filter(
                status=RentalCompany.Status.PENDING
            ).count()
        except Exception:
            ctx['pending_rental_companies_count'] = 0

    return ctx
