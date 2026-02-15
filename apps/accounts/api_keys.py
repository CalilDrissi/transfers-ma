import hashlib
import secrets

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class APIKey(models.Model):
    """API Key for authenticating external API consumers."""

    class Tier(models.TextChoices):
        FREE = 'free', _('Free')
        STANDARD = 'standard', _('Standard')
        PREMIUM = 'premium', _('Premium')

    name = models.CharField(_('name'), max_length=100, help_text=_('e.g. "WordPress Plugin"'))
    key = models.CharField(_('key hash'), max_length=64, unique=True, db_index=True)
    prefix = models.CharField(_('prefix'), max_length=8, help_text=_('First 8 chars for display'))
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='api_keys',
        verbose_name=_('owner'),
    )
    tier = models.CharField(
        _('tier'),
        max_length=20,
        choices=Tier.choices,
        default=Tier.STANDARD,
    )
    is_active = models.BooleanField(_('active'), default=True)
    allowed_origins = models.JSONField(
        _('allowed origins'),
        default=list,
        blank=True,
        help_text=_('List of allowed CORS origins for this key'),
    )
    rate_limit = models.PositiveIntegerField(
        _('rate limit'),
        default=100,
        help_text=_('Maximum requests per minute'),
    )
    last_used_at = models.DateTimeField(_('last used at'), null=True, blank=True)
    expires_at = models.DateTimeField(_('expires at'), null=True, blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('API key')
        verbose_name_plural = _('API keys')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.prefix}...)"

    @classmethod
    def generate_key(cls):
        """Generate a new API key. Returns (raw_key, hashed_key, prefix)."""
        raw_key = secrets.token_hex(32)
        hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix = raw_key[:8]
        return raw_key, hashed_key, prefix

    @classmethod
    def hash_key(cls, raw_key):
        """Hash a raw API key for lookup."""
        return hashlib.sha256(raw_key.encode()).hexdigest()
