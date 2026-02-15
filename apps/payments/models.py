import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class PaymentGateway(models.Model):
    """Configurable payment gateways."""

    class GatewayType(models.TextChoices):
        STRIPE = 'stripe', _('Stripe')
        PAYPAL = 'paypal', _('PayPal')
        BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')
        CASH = 'cash', _('Cash on Delivery')
        # Add more gateways as needed

    name = models.CharField(_('name'), max_length=100)
    gateway_type = models.CharField(
        _('gateway type'),
        max_length=20,
        choices=GatewayType.choices,
        unique=True
    )
    display_name = models.CharField(_('display name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    icon = models.CharField(_('icon'), max_length=50, blank=True)
    is_active = models.BooleanField(_('active'), default=True)
    is_test_mode = models.BooleanField(_('test mode'), default=True)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    # Configuration (stored as JSON)
    config = models.JSONField(
        _('configuration'),
        default=dict,
        blank=True,
        help_text=_('Gateway-specific configuration')
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('payment gateway')
        verbose_name_plural = _('payment gateways')
        ordering = ['order', 'name']

    def __str__(self):
        return self.display_name


class Payment(models.Model):
    """Payment transaction record."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PROCESSING = 'processing', _('Processing')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')
        REFUNDED = 'refunded', _('Refunded')
        PARTIALLY_REFUNDED = 'partially_refunded', _('Partially Refunded')
        CANCELLED = 'cancelled', _('Cancelled')

    class PaymentType(models.TextChoices):
        TRANSFER = 'transfer', _('Transfer Booking')
        TRIP = 'trip', _('Trip Booking')
        RENTAL = 'rental', _('Car Rental')

    # Payment reference
    payment_ref = models.CharField(
        _('payment reference'),
        max_length=30,
        unique=True,
        editable=False
    )

    # Generic relation to booking
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name=_('booking type')
    )
    object_id = models.PositiveIntegerField(_('booking id'))
    booking = GenericForeignKey('content_type', 'object_id')

    payment_type = models.CharField(
        _('payment type'),
        max_length=20,
        choices=PaymentType.choices
    )

    # Customer
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name=_('customer')
    )
    customer_email = models.EmailField(_('customer email'))

    # Gateway
    gateway = models.ForeignKey(
        PaymentGateway,
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name=_('payment gateway')
    )

    # Amount
    amount = models.DecimalField(_('amount'), max_digits=10, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=3, default='MAD')

    # Gateway-specific IDs
    gateway_payment_id = models.CharField(
        _('gateway payment ID'),
        max_length=255,
        blank=True,
        help_text=_('Payment ID from the gateway (e.g., Stripe PaymentIntent ID)')
    )
    gateway_customer_id = models.CharField(
        _('gateway customer ID'),
        max_length=255,
        blank=True
    )

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    # Metadata
    metadata = models.JSONField(
        _('metadata'),
        default=dict,
        blank=True
    )

    # Refund tracking
    refunded_amount = models.DecimalField(
        _('refunded amount'),
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # Coupon
    coupon = models.ForeignKey(
        'Coupon',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name=_('coupon'),
    )
    coupon_discount = models.DecimalField(
        _('coupon discount'),
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    # Error handling
    error_message = models.TextField(_('error message'), blank=True)

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    completed_at = models.DateTimeField(_('completed at'), null=True, blank=True)

    class Meta:
        verbose_name = _('payment')
        verbose_name_plural = _('payments')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['gateway_payment_id']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.payment_ref} - {self.amount} {self.currency}"

    def save(self, *args, **kwargs):
        if not self.payment_ref:
            self.payment_ref = self.generate_payment_ref()
        super().save(*args, **kwargs)

    def generate_payment_ref(self):
        return f"PAY-{uuid.uuid4().hex[:12].upper()}"

    @property
    def is_paid(self):
        return self.status == self.Status.COMPLETED

    @property
    def can_refund(self):
        return self.status == self.Status.COMPLETED and self.refunded_amount < self.amount


class Refund(models.Model):
    """Refund record."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PROCESSING = 'processing', _('Processing')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')

    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds',
        verbose_name=_('payment')
    )
    refund_ref = models.CharField(
        _('refund reference'),
        max_length=30,
        unique=True,
        editable=False
    )
    amount = models.DecimalField(_('amount'), max_digits=10, decimal_places=2)
    reason = models.TextField(_('reason'), blank=True)
    gateway_refund_id = models.CharField(
        _('gateway refund ID'),
        max_length=255,
        blank=True
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_refunds',
        verbose_name=_('processed by')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    completed_at = models.DateTimeField(_('completed at'), null=True, blank=True)

    class Meta:
        verbose_name = _('refund')
        verbose_name_plural = _('refunds')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.refund_ref} - {self.amount}"

    def save(self, *args, **kwargs):
        if not self.refund_ref:
            self.refund_ref = f"REF-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)


class Invoice(models.Model):
    """Invoice for payments."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        SENT = 'sent', _('Sent')
        PAID = 'paid', _('Paid')
        CANCELLED = 'cancelled', _('Cancelled')

    invoice_number = models.CharField(
        _('invoice number'),
        max_length=30,
        unique=True,
        editable=False
    )
    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        related_name='invoice',
        verbose_name=_('payment')
    )

    # Customer details (snapshot)
    customer_name = models.CharField(_('customer name'), max_length=200)
    customer_email = models.EmailField(_('customer email'))
    customer_address = models.TextField(_('customer address'), blank=True)

    # Invoice details
    subtotal = models.DecimalField(_('subtotal'), max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(
        _('tax rate'),
        max_digits=5,
        decimal_places=2,
        default=0
    )
    tax_amount = models.DecimalField(
        _('tax amount'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    total = models.DecimalField(_('total'), max_digits=10, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=3, default='MAD')

    # Line items (JSON)
    line_items = models.JSONField(
        _('line items'),
        default=list,
        blank=True
    )

    notes = models.TextField(_('notes'), blank=True)
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )

    # PDF
    pdf_file = models.FileField(
        _('PDF file'),
        upload_to='invoices/',
        blank=True,
        null=True
    )

    # Dates
    issue_date = models.DateField(_('issue date'), auto_now_add=True)
    due_date = models.DateField(_('due date'), null=True, blank=True)
    paid_date = models.DateField(_('paid date'), null=True, blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('invoice')
        verbose_name_plural = _('invoices')
        ordering = ['-created_at']

    def __str__(self):
        return self.invoice_number

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        super().save(*args, **kwargs)

    def generate_invoice_number(self):
        from datetime import datetime
        year = datetime.now().year
        count = Invoice.objects.filter(
            created_at__year=year
        ).count() + 1
        return f"INV-{year}-{count:05d}"


class Coupon(models.Model):
    """Coupon/promo code for discounts."""

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', _('Percentage')
        FIXED = 'fixed', _('Fixed Amount')

    class ApplicableTo(models.TextChoices):
        ALL = 'all', _('All Bookings')
        TRANSFER = 'transfer', _('Transfers')
        TRIP = 'trip', _('Trips')
        RENTAL = 'rental', _('Rentals')

    code = models.CharField(_('code'), max_length=50, unique=True)
    description = models.TextField(_('description'), blank=True)
    discount_type = models.CharField(
        _('discount type'),
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
    )
    discount_value = models.DecimalField(_('discount value'), max_digits=10, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=3, default='MAD')
    min_order_amount = models.DecimalField(
        _('minimum order amount'), max_digits=10, decimal_places=2, default=0
    )
    max_discount_amount = models.DecimalField(
        _('maximum discount amount'), max_digits=10, decimal_places=2, null=True, blank=True
    )
    usage_limit = models.PositiveIntegerField(_('usage limit'), null=True, blank=True)
    usage_per_customer = models.PositiveIntegerField(_('usage per customer'), null=True, blank=True)
    used_count = models.PositiveIntegerField(_('used count'), default=0)
    valid_from = models.DateTimeField(_('valid from'), null=True, blank=True)
    valid_until = models.DateTimeField(_('valid until'), null=True, blank=True)
    applicable_to = models.CharField(
        _('applicable to'),
        max_length=20,
        choices=ApplicableTo.choices,
        default=ApplicableTo.ALL,
    )
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('coupon')
        verbose_name_plural = _('coupons')
        ordering = ['-created_at']

    def __str__(self):
        return self.code

    def calculate_discount(self, amount):
        """Calculate the discount for a given amount."""
        from decimal import Decimal
        if self.discount_type == self.DiscountType.PERCENTAGE:
            discount = amount * self.discount_value / Decimal('100')
        else:
            discount = self.discount_value

        if self.max_discount_amount:
            discount = min(discount, self.max_discount_amount)

        return discount.quantize(Decimal('0.01'))

    def is_valid(self, booking_type=None, amount=None, customer_email=None):
        """Check if coupon is valid for the given context."""
        from django.utils import timezone

        if not self.is_active:
            return False, 'Coupon is not active.'

        if self.valid_from and timezone.now() < self.valid_from:
            return False, 'Coupon is not yet valid.'

        if self.valid_until and timezone.now() > self.valid_until:
            return False, 'Coupon has expired.'

        if self.usage_limit and self.used_count >= self.usage_limit:
            return False, 'Coupon usage limit reached.'

        if self.applicable_to != 'all' and booking_type and self.applicable_to != booking_type:
            return False, f'Coupon not applicable to {booking_type} bookings.'

        if amount and self.min_order_amount and amount < self.min_order_amount:
            return False, f'Minimum order amount is {self.min_order_amount} {self.currency}.'

        if customer_email and self.usage_per_customer:
            customer_uses = CouponUsage.objects.filter(
                coupon=self, customer_email=customer_email
            ).count()
            if customer_uses >= self.usage_per_customer:
                return False, 'You have already used this coupon the maximum number of times.'

        return True, 'Coupon is valid.'


class CouponUsage(models.Model):
    """Track coupon usage."""

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name='usages',
        verbose_name=_('coupon'),
    )
    customer_email = models.EmailField(_('customer email'))
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coupon_usages',
        verbose_name=_('payment'),
    )
    discount_applied = models.DecimalField(_('discount applied'), max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(_('used at'), auto_now_add=True)

    class Meta:
        verbose_name = _('coupon usage')
        verbose_name_plural = _('coupon usages')
        ordering = ['-used_at']

    def __str__(self):
        return f"{self.coupon.code} - {self.customer_email}"
