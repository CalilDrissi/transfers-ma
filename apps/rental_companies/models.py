from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class RentalCompany(models.Model):
    """Rental car company that lists vehicles on the platform."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending Review')
        APPROVED = 'approved', _('Approved')
        SUSPENDED = 'suspended', _('Suspended')
        REJECTED = 'rejected', _('Rejected')

    class Tier(models.TextChoices):
        BASIC = 'basic', _('Basic')
        PREMIUM = 'premium', _('Premium')
        ENTERPRISE = 'enterprise', _('Enterprise')

    # Owner
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rental_company',
    )

    # Company info
    company_name = models.CharField(_('company name'), max_length=200)
    slug = models.SlugField(_('slug'), unique=True, max_length=200)
    description = models.TextField(_('description'), blank=True)
    short_description = models.CharField(_('short description'), max_length=300, blank=True)
    logo = models.ImageField(_('logo'), upload_to='rental_companies/logos/', blank=True, null=True)
    cover_image = models.ImageField(_('cover image'), upload_to='rental_companies/covers/', blank=True, null=True)

    # Contact
    email = models.EmailField(_('email'))
    phone = models.CharField(_('phone'), max_length=20)
    whatsapp = models.CharField(_('whatsapp'), max_length=20, blank=True)
    website = models.URLField(_('website'), blank=True)

    # Address
    address = models.TextField(_('address'))
    city = models.CharField(_('city'), max_length=100)
    region = models.CharField(_('region'), max_length=100, blank=True)
    postal_code = models.CharField(_('postal code'), max_length=10, blank=True)
    latitude = models.DecimalField(_('latitude'), max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(_('longitude'), max_digits=10, decimal_places=7, null=True, blank=True)

    # Business details
    ice_number = models.CharField(
        _('ICE number'), max_length=20, blank=True,
        help_text=_("Identifiant Commun de l'Entreprise"),
    )
    rc_number = models.CharField(
        _('RC number'), max_length=20, blank=True,
        help_text=_('Registre du Commerce number'),
    )
    tax_id = models.CharField(_('tax ID'), max_length=30, blank=True)
    license_number = models.CharField(
        _('license number'), max_length=50, blank=True,
        help_text=_('Car rental license / autorisation de location de voiture'),
    )

    # Platform settings
    status = models.CharField(_('status'), max_length=20, choices=Status.choices, default=Status.PENDING)
    tier = models.CharField(_('tier'), max_length=20, choices=Tier.choices, default=Tier.BASIC)
    commission_rate = models.DecimalField(
        _('commission rate'), max_digits=5, decimal_places=2, default=15.00,
        help_text=_('Platform commission percentage on each booking'),
    )
    is_featured = models.BooleanField(_('featured'), default=False)
    priority_order = models.IntegerField(_('priority order'), default=0, help_text=_('Higher = shown first'))

    # Capabilities
    offers_delivery = models.BooleanField(_('offers delivery'), default=False)
    delivery_fee = models.DecimalField(_('delivery fee'), max_digits=10, decimal_places=2, default=0)
    delivery_radius_km = models.PositiveIntegerField(_('delivery radius km'), default=0)
    offers_airport_pickup = models.BooleanField(_('offers airport pickup'), default=False)
    minimum_rental_days = models.PositiveIntegerField(_('minimum rental days'), default=1)
    maximum_rental_days = models.PositiveIntegerField(_('maximum rental days'), default=30)
    minimum_driver_age = models.PositiveIntegerField(_('minimum driver age'), default=21)
    accepted_payment_methods = models.JSONField(_('accepted payment methods'), default=list, blank=True)

    # Operating hours
    operating_hours = models.JSONField(
        _('operating hours'), default=dict, blank=True,
        help_text=_('{"mon": {"open": "08:00", "close": "20:00"}, ...}'),
    )

    # Pickup locations
    pickup_cities = models.JSONField(
        _('pickup cities'), default=list, blank=True,
        help_text=_('List of city names where cars can be picked up'),
    )

    # Ratings
    average_rating = models.DecimalField(_('average rating'), max_digits=3, decimal_places=2, default=0)
    total_reviews = models.PositiveIntegerField(_('total reviews'), default=0)
    total_bookings = models.PositiveIntegerField(_('total bookings'), default=0)

    # Admin
    admin_notes = models.TextField(_('admin notes'), blank=True)
    rejection_reason = models.TextField(_('rejection reason'), blank=True)
    approved_at = models.DateTimeField(_('approved at'), null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='approved_companies',
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('rental company')
        verbose_name_plural = _('rental companies')
        ordering = ['-is_featured', '-priority_order', '-average_rating']

    def __str__(self):
        return self.company_name

    @property
    def is_active(self):
        return self.status == self.Status.APPROVED


class CompanyDocument(models.Model):
    """Documents uploaded by rental companies."""

    class DocType(models.TextChoices):
        BUSINESS_LICENSE = 'business_license', _('Business License')
        RENTAL_LICENSE = 'rental_license', _('Car Rental License')
        INSURANCE = 'insurance', _('Insurance Certificate')
        TAX_CERTIFICATE = 'tax_certificate', _('Tax Certificate')
        ID_CARD = 'id_card', _('National ID Card')
        OTHER = 'other', _('Other')

    class VerificationStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        VERIFIED = 'verified', _('Verified')
        REJECTED = 'rejected', _('Rejected')

    company = models.ForeignKey(RentalCompany, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(_('document type'), max_length=30, choices=DocType.choices)
    file = models.FileField(_('file'), upload_to='rental_companies/documents/')
    name = models.CharField(_('name'), max_length=200)
    expiry_date = models.DateField(_('expiry date'), null=True, blank=True)
    verification_status = models.CharField(
        _('verification status'), max_length=20,
        choices=VerificationStatus.choices, default=VerificationStatus.PENDING,
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
    )
    verified_at = models.DateTimeField(_('verified at'), null=True, blank=True)
    rejection_reason = models.TextField(_('rejection reason'), blank=True)
    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)

    class Meta:
        verbose_name = _('company document')
        verbose_name_plural = _('company documents')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.get_document_type_display()} — {self.company.company_name}"


class CompanyReview(models.Model):
    """Customer reviews for rental companies."""

    company = models.ForeignKey(RentalCompany, on_delete=models.CASCADE, related_name='reviews')
    rental = models.OneToOneField('rentals.Rental', on_delete=models.CASCADE, related_name='review')
    customer_name = models.CharField(_('customer name'), max_length=200)
    customer_email = models.EmailField(_('customer email'))
    rating = models.PositiveSmallIntegerField(_('rating'), choices=[(i, i) for i in range(1, 6)])
    title = models.CharField(_('title'), max_length=200, blank=True)
    comment = models.TextField(_('comment'), blank=True)
    vehicle_condition_rating = models.PositiveSmallIntegerField(_('vehicle condition'), null=True, blank=True)
    service_rating = models.PositiveSmallIntegerField(_('service rating'), null=True, blank=True)
    value_rating = models.PositiveSmallIntegerField(_('value rating'), null=True, blank=True)
    company_response = models.TextField(_('company response'), blank=True)
    company_responded_at = models.DateTimeField(_('responded at'), null=True, blank=True)
    is_published = models.BooleanField(_('published'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('company review')
        verbose_name_plural = _('company reviews')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}★ — {self.company.company_name}"


class CompanyPayout(models.Model):
    """Track payouts to rental companies."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PROCESSING = 'processing', _('Processing')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')

    company = models.ForeignKey(RentalCompany, on_delete=models.CASCADE, related_name='payouts')
    period_start = models.DateField(_('period start'))
    period_end = models.DateField(_('period end'))
    total_bookings = models.PositiveIntegerField(_('total bookings'), default=0)
    gross_amount = models.DecimalField(_('gross amount'), max_digits=12, decimal_places=2)
    commission_amount = models.DecimalField(_('commission amount'), max_digits=12, decimal_places=2)
    net_amount = models.DecimalField(_('net amount'), max_digits=12, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=3, default='MAD')
    status = models.CharField(_('status'), max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(_('payment method'), max_length=50, blank=True)
    payment_reference = models.CharField(_('payment reference'), max_length=100, blank=True)
    paid_at = models.DateTimeField(_('paid at'), null=True, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('company payout')
        verbose_name_plural = _('company payouts')
        ordering = ['-period_end']

    def __str__(self):
        return f"{self.company.company_name} — {self.period_start} to {self.period_end}"


class VehicleAvailability(models.Model):
    """Block dates when a vehicle is NOT available."""

    class Reason(models.TextChoices):
        BOOKED = 'booked', _('Booked')
        MAINTENANCE = 'maintenance', _('Maintenance')
        UNAVAILABLE = 'unavailable', _('Unavailable')

    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.CASCADE, related_name='availability_blocks')
    company = models.ForeignKey(RentalCompany, on_delete=models.CASCADE, related_name='availability_blocks')
    start_date = models.DateField(_('start date'))
    end_date = models.DateField(_('end date'))
    reason = models.CharField(_('reason'), max_length=20, choices=Reason.choices, default=Reason.UNAVAILABLE)
    notes = models.TextField(_('notes'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('vehicle availability block')
        verbose_name_plural = _('vehicle availability blocks')
        ordering = ['start_date']

    def __str__(self):
        return f"{self.vehicle.name} blocked {self.start_date}–{self.end_date}"
