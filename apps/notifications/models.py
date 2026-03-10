from django.db import models


class EmailTemplate(models.Model):
    class EmailType(models.TextChoices):
        BOOKING_CUSTOMER = 'booking_customer', 'Customer Confirmation'
        BOOKING_ADMIN = 'booking_admin', 'Admin Alert'
        BOOKING_SUPPLIER = 'booking_supplier', 'Supplier Alert'
        ZONE_CUSTOMER = 'zone_customer', 'Zone - Customer Confirmation'
        ZONE_ADMIN = 'zone_admin', 'Zone - Admin Alert'
        ZONE_SUPPLIER = 'zone_supplier', 'Zone - Supplier Alert'
        ROUTE_CUSTOMER = 'route_customer', 'Route - Customer Confirmation'
        ROUTE_ADMIN = 'route_admin', 'Route - Admin Alert'
        ROUTE_SUPPLIER = 'route_supplier', 'Route - Supplier Alert'

    CATEGORY_CHOICES = {
        'bookings': ['booking_customer', 'booking_admin', 'booking_supplier'],
        'zones': ['zone_customer', 'zone_admin', 'zone_supplier'],
        'routes': ['route_customer', 'route_admin', 'route_supplier'],
    }

    email_type = models.CharField(max_length=30, choices=EmailType.choices, unique=True)
    subject = models.CharField(max_length=200)
    heading = models.CharField(max_length=200)
    logo = models.ImageField(upload_to='email_logos/', blank=True)
    intro_text = models.TextField(blank=True)
    closing_text = models.TextField(blank=True)

    show_pickup = models.BooleanField(default=True)
    show_dropoff = models.BooleanField(default=True)
    show_datetime = models.BooleanField(default=True)
    show_vehicle = models.BooleanField(default=True)
    show_passengers = models.BooleanField(default=True)
    show_trip_type = models.BooleanField(default=True)
    show_flight_number = models.BooleanField(default=True)
    show_special_requests = models.BooleanField(default=True)
    show_price = models.BooleanField(default=True)
    show_customer_info = models.BooleanField(default=True)

    cc_emails = models.TextField(
        blank=True,
        default='',
        help_text='Comma-separated email addresses to CC on every email sent with this template.',
    )

    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'

    def __str__(self):
        return self.get_email_type_display()

    DEFAULTS = {
        'booking_customer': {
            'subject': 'Booking Confirmation - {booking_ref}',
            'heading': 'Booking Confirmed',
            'intro_text': 'Thank you for your booking! Your reservation has been confirmed.',
            'closing_text': "If you have any questions, please don't hesitate to contact us.",
        },
        'booking_admin': {
            'subject': 'New Booking - {booking_ref}',
            'heading': 'New Booking Alert',
            'intro_text': 'A new transfer booking has been placed.',
            'closing_text': '',
        },
        'booking_supplier': {
            'subject': 'New Transfer Booking - {booking_ref}',
            'heading': 'New Transfer Booking',
            'intro_text': 'A new transfer has been booked that requires your vehicle.',
            'closing_text': 'Please ensure the vehicle is ready for this transfer.',
        },
        'zone_customer': {
            'subject': 'Booking Confirmation - {booking_ref}',
            'heading': 'Booking Confirmed',
            'intro_text': 'Thank you for your booking! Your zone transfer has been confirmed.',
            'closing_text': "If you have any questions, please don't hesitate to contact us.",
        },
        'zone_admin': {
            'subject': 'New Zone Booking - {booking_ref}',
            'heading': 'New Zone Booking',
            'intro_text': 'A new zone transfer booking has been placed.',
            'closing_text': '',
        },
        'zone_supplier': {
            'subject': 'New Zone Transfer - {booking_ref}',
            'heading': 'New Zone Transfer',
            'intro_text': 'A new zone transfer has been booked that requires your vehicle.',
            'closing_text': 'Please ensure the vehicle is ready for this transfer.',
        },
        'route_customer': {
            'subject': 'Booking Confirmation - {booking_ref}',
            'heading': 'Booking Confirmed',
            'intro_text': 'Thank you for your booking! Your route transfer has been confirmed.',
            'closing_text': "If you have any questions, please don't hesitate to contact us.",
        },
        'route_admin': {
            'subject': 'New Route Booking - {booking_ref}',
            'heading': 'New Route Booking',
            'intro_text': 'A new route transfer booking has been placed.',
            'closing_text': '',
        },
        'route_supplier': {
            'subject': 'New Route Transfer - {booking_ref}',
            'heading': 'New Route Transfer',
            'intro_text': 'A new route transfer has been booked that requires your vehicle.',
            'closing_text': 'Please ensure the vehicle is ready for this transfer.',
        },
    }

    @classmethod
    def ensure_defaults(cls):
        for email_type, defaults in cls.DEFAULTS.items():
            cls.objects.get_or_create(email_type=email_type, defaults=defaults)

    def get_subject(self, **kwargs):
        try:
            return self.subject.format(**kwargs)
        except (KeyError, IndexError):
            return self.subject

    def get_cc_list(self):
        """Return a list of CC email addresses."""
        if not self.cc_emails:
            return []
        return [e.strip() for e in self.cc_emails.split(',') if e.strip()]

    def template_context(self):
        return {
            'heading': self.heading,
            'intro_text': self.intro_text,
            'closing_text': self.closing_text,
            'logo_url': self.logo.url if self.logo else '',
            'show_pickup': self.show_pickup,
            'show_dropoff': self.show_dropoff,
            'show_datetime': self.show_datetime,
            'show_vehicle': self.show_vehicle,
            'show_passengers': self.show_passengers,
            'show_trip_type': self.show_trip_type,
            'show_flight_number': self.show_flight_number,
            'show_special_requests': self.show_special_requests,
            'show_price': self.show_price,
            'show_customer_info': self.show_customer_info,
        }

    @staticmethod
    def resolve_type(role, pricing_method=''):
        """Resolve email_type based on role and pricing method, with fallback to booking_*."""
        if pricing_method == 'zone':
            return f'zone_{role}'
        elif pricing_method == 'route':
            return f'route_{role}'
        return f'booking_{role}'
