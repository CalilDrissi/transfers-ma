from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model with email-based authentication and roles."""

    class Role(models.TextChoices):
        ADMIN = 'admin', _('Admin')
        MANAGER = 'manager', _('Manager')
        DRIVER = 'driver', _('Driver')
        CLIENT = 'client', _('Client')

    username = None
    email = models.EmailField(_('email address'), unique=True)
    phone = models.CharField(_('phone number'), max_length=20, blank=True)
    role = models.CharField(
        _('role'),
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT
    )
    avatar = models.ImageField(
        _('avatar'),
        upload_to='avatars/',
        blank=True,
        null=True
    )
    is_verified = models.BooleanField(_('email verified'), default=False)
    language = models.CharField(
        _('preferred language'),
        max_length=10,
        default='en'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip() or self.email

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    @property
    def is_manager(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER]

    @property
    def is_driver(self):
        return self.role == self.Role.DRIVER


class Profile(models.Model):
    """Extended profile information for users."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    address = models.TextField(_('address'), blank=True)
    city = models.CharField(_('city'), max_length=100, blank=True)
    country = models.CharField(_('country'), max_length=100, blank=True)
    postal_code = models.CharField(_('postal code'), max_length=20, blank=True)
    date_of_birth = models.DateField(_('date of birth'), null=True, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('profile')
        verbose_name_plural = _('profiles')

    def __str__(self):
        return f"Profile of {self.user.email}"


class DriverProfile(models.Model):
    """Extended profile for drivers."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='driver_profile'
    )
    license_number = models.CharField(_('license number'), max_length=50)
    license_expiry = models.DateField(_('license expiry date'))
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='drivers',
        verbose_name=_('assigned vehicle')
    )
    is_available = models.BooleanField(_('available'), default=True)
    rating = models.DecimalField(
        _('rating'),
        max_digits=3,
        decimal_places=2,
        default=5.00
    )
    total_trips = models.PositiveIntegerField(_('total trips'), default=0)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('driver profile')
        verbose_name_plural = _('driver profiles')

    def __str__(self):
        return f"Driver: {self.user.full_name}"


class SiteSettings(models.Model):
    """Singleton model for site-wide settings and API keys."""

    # API Keys
    google_maps_api_key = models.CharField(
        _('Google Maps API Key'),
        max_length=255,
        blank=True,
        help_text=_('API key for Google Maps integration')
    )

    # Stripe API Keys
    stripe_publishable_key = models.CharField(
        _('Stripe Publishable Key'),
        max_length=255,
        blank=True,
        help_text=_('Public key for Stripe (starts with pk_)')
    )
    stripe_secret_key = models.CharField(
        _('Stripe Secret Key'),
        max_length=255,
        blank=True,
        help_text=_('Secret key for Stripe (starts with sk_)')
    )
    stripe_webhook_secret = models.CharField(
        _('Stripe Webhook Secret'),
        max_length=255,
        blank=True,
        help_text=_('Webhook signing secret for verifying Stripe events (starts with whsec_)')
    )

    # General Settings
    site_name = models.CharField(
        _('Site Name'),
        max_length=100,
        default='Transfers.ma'
    )
    contact_email = models.EmailField(
        _('Contact Email'),
        blank=True
    )
    contact_phone = models.CharField(
        _('Contact Phone'),
        max_length=20,
        blank=True
    )
    default_currency = models.CharField(
        _('Default Currency'),
        max_length=3,
        default='MAD',
        help_text=_('Currency for customer prices')
    )
    cost_currency = models.CharField(
        _('Cost Currency'),
        max_length=3,
        default='MAD',
        help_text=_('Currency for supplier costs')
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('site settings')
        verbose_name_plural = _('site settings')

    def __str__(self):
        return "Site Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
