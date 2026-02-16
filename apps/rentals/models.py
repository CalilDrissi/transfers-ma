import uuid
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class InsuranceOption(models.Model):
    """Insurance options available for car rentals."""

    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    price_per_day = models.DecimalField(_('price per day'), max_digits=10, decimal_places=2)
    coverage_details = models.TextField(_('coverage details'), blank=True)
    is_active = models.BooleanField(_('active'), default=True)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('insurance option')
        verbose_name_plural = _('insurance options')
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class RentalExtra(models.Model):
    """Optional extras for car rentals (GPS, child seat, etc.)."""

    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    price_per_day = models.DecimalField(_('price per day'), max_digits=10, decimal_places=2)
    max_quantity = models.PositiveSmallIntegerField(_('max quantity'), default=1)
    icon = models.CharField(_('icon'), max_length=50, blank=True)
    is_active = models.BooleanField(_('active'), default=True)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('rental extra')
        verbose_name_plural = _('rental extras')
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Rental(models.Model):
    """Car rental booking."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        CONFIRMED = 'confirmed', _('Confirmed')
        ACTIVE = 'active', _('Active')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
        NO_SHOW = 'no_show', _('No Show')

    # Booking reference
    booking_ref = models.CharField(
        _('booking reference'), max_length=30, unique=True, editable=False,
    )

    # Company
    company = models.ForeignKey(
        'rental_companies.RentalCompany', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='bookings',
        verbose_name=_('rental company'),
    )

    # Vehicle
    vehicle = models.ForeignKey(
        'vehicles.Vehicle', on_delete=models.SET_NULL,
        null=True, related_name='rental_bookings',
        verbose_name=_('vehicle'),
    )

    # Customer
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='rental_bookings',
        verbose_name=_('customer'),
    )
    customer_name = models.CharField(_('customer name'), max_length=200)
    customer_email = models.EmailField(_('customer email'))
    customer_phone = models.CharField(_('customer phone'), max_length=20)

    # Driver info
    driver_license_number = models.CharField(_('driver license number'), max_length=50, blank=True)
    driver_license_expiry = models.DateField(_('driver license expiry'), null=True, blank=True)
    driver_date_of_birth = models.DateField(_('driver date of birth'), null=True, blank=True)
    flight_number = models.CharField(_('flight number'), max_length=20, blank=True)

    # Dates
    pickup_date = models.DateField(_('pickup date'))
    return_date = models.DateField(_('return date'))
    actual_return_date = models.DateField(_('actual return date'), null=True, blank=True)

    # Pickup/dropoff
    pickup_location = models.CharField(_('pickup location'), max_length=300, blank=True)
    dropoff_location = models.CharField(_('dropoff location'), max_length=300, blank=True)

    # Insurance
    insurance = models.ForeignKey(
        InsuranceOption, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='rentals',
        verbose_name=_('insurance'),
    )
    insurance_total = models.DecimalField(_('insurance total'), max_digits=10, decimal_places=2, default=0)

    # Pricing
    daily_rate = models.DecimalField(_('daily rate'), max_digits=10, decimal_places=2)
    total_days = models.PositiveIntegerField(_('total days'))
    vehicle_total = models.DecimalField(_('vehicle total'), max_digits=10, decimal_places=2)
    extras_total = models.DecimalField(_('extras total'), max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(_('delivery fee'), max_digits=10, decimal_places=2, default=0)
    deposit_amount = models.DecimalField(_('deposit amount'), max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(_('total price'), max_digits=10, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=3, default='MAD')

    # Commission
    commission_rate = models.DecimalField(
        _('commission rate'), max_digits=5, decimal_places=2, default=0,
        help_text=_('Platform commission % at time of booking'),
    )
    commission_amount = models.DecimalField(_('commission amount'), max_digits=10, decimal_places=2, default=0)
    company_payout_amount = models.DecimalField(_('company payout'), max_digits=10, decimal_places=2, default=0)
    payout = models.ForeignKey(
        'rental_companies.CompanyPayout', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='rentals',
        verbose_name=_('payout'),
    )

    # Status
    status = models.CharField(_('status'), max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(_('notes'), blank=True)
    company_notes = models.TextField(_('company notes'), blank=True)
    cancellation_reason = models.TextField(_('cancellation reason'), blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('rental')
        verbose_name_plural = _('rentals')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.booking_ref} — {self.customer_name}"

    def save(self, *args, **kwargs):
        if not self.booking_ref:
            self.booking_ref = f"RNT-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)


class RentalExtraBooking(models.Model):
    """Extras selected for a specific rental booking."""

    rental = models.ForeignKey(Rental, on_delete=models.CASCADE, related_name='booked_extras')
    extra = models.ForeignKey(RentalExtra, on_delete=models.SET_NULL, null=True, related_name='bookings')
    quantity = models.PositiveSmallIntegerField(_('quantity'), default=1)
    price_per_day = models.DecimalField(_('price per day'), max_digits=10, decimal_places=2)
    total = models.DecimalField(_('total'), max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = _('rental extra booking')
        verbose_name_plural = _('rental extra bookings')

    def __str__(self):
        return f"{self.extra.name if self.extra else 'Extra'} × {self.quantity}"
