from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def status_badge(status):
    """Return Bootstrap badge class for status."""
    status_classes = {
        'pending': 'bg-warning text-dark',
        'confirmed': 'bg-info',
        'assigned': 'bg-primary',
        'in_progress': 'bg-primary',
        'active': 'bg-success',
        'completed': 'bg-success',
        'cancelled': 'bg-danger',
        'failed': 'bg-danger',
        'no_show': 'bg-secondary',
        'refunded': 'bg-secondary',
        'processing': 'bg-info',
    }
    css_class = status_classes.get(status, 'bg-secondary')
    return mark_safe(f'<span class="badge {css_class}">{status.replace("_", " ").title()}</span>')


@register.filter
def currency(value, code=None):
    """Format value as currency (uses site settings if no code provided)."""
    if value is None:
        return '-'
    if code is None:
        from apps.accounts.models import SiteSettings
        try:
            settings = SiteSettings.get_settings()
            code = settings.default_currency or 'MAD'
        except Exception:
            code = 'MAD'
    return f"{value:,.2f} {code}"


@register.filter
def cost_currency(value, code=None):
    """Format value as cost currency (uses site settings if no code provided)."""
    if value is None:
        return '-'
    if code is None:
        from apps.accounts.models import SiteSettings
        try:
            settings = SiteSettings.get_settings()
            code = settings.cost_currency or 'MAD'
        except Exception:
            code = 'MAD'
    return f"{value:,.2f} {code}"


@register.simple_tag
def active_link(request, pattern):
    """Return 'active' if current URL matches pattern."""
    import re
    if re.search(pattern, request.path):
        return 'active'
    return ''


@register.filter
def get_item(dictionary, key):
    """Get item from dictionary."""
    return dictionary.get(key)


@register.filter
def percentage(value, total):
    """Calculate percentage."""
    if total == 0:
        return 0
    return round((value / total) * 100, 1)
