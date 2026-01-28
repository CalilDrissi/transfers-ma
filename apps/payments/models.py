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
