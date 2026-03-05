from django.db import models


class EmailTemplate(models.Model):
    class EmailType(models.TextChoices):
        BOOKING_CUSTOMER = 'booking_customer', 'Customer Confirmation'
        BOOKING_ADMIN = 'booking_admin', 'Admin Alert'
        BOOKING_SUPPLIER = 'booking_supplier', 'Supplier Alert'

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
