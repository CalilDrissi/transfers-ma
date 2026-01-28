import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class Trip(models.Model):
    """Tour/excursion template."""

    class TripType(models.TextChoices):
        DAY_TRIP = 'day_trip', _('Day Trip')
        MULTI_DAY = 'multi_day', _('Multi-Day Tour')
        HALF_DAY = 'half_day', _('Half-Day Trip')
        PRIVATE = 'private', _('Private Tour')
        GROUP = 'group', _('Group Tour')

    class ServiceType(models.TextChoices):
        TOUR = 'tour', _('Guided Tour')
        TRANSFER = 'transfer', _('Transfer Service')
        EXCURSION = 'excursion', _('Day Excursion')
        ACTIVITY = 'activity', _('Activity')

    class PricingModel(models.TextChoices):
        PER_PERSON = 'per_person', _('Per Person')
        PER_GROUP = 'per_group', _('Per Group (Flat Rate)')
        TIERED = 'tiered', _('Tiered Pricing')

    class CancellationPolicy(models.TextChoices):
        FLEXIBLE = 'flexible', _('Flexible - Full refund up to 24h before')
        MODERATE = 'moderate', _('Moderate - Full refund up to 48h before')
        STRICT = 'strict', _('Strict - 50% refund up to 7 days before')
        NON_REFUNDABLE = 'non_refundable', _('Non-refundable')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        PUBLISHED = 'published', _('Published')
        ARCHIVED = 'archived', _('Archived')

    # Basic Info
    name = models.CharField(_('name'), max_length=200)
    slug = models.SlugField(_('slug'), unique=True, max_length=200)
    description = models.TextField(_('description'))
    short_description = models.CharField(_('short description'), max_length=300)
    trip_type = models.CharField(
        _('trip type'),
        max_length=20,
        choices=TripType.choices,
        default=TripType.DAY_TRIP
    )
    service_type = models.CharField(
        _('service type'),
        max_length=20,
        choices=ServiceType.choices,
        default=ServiceType.TOUR
    )

    # Departure location (text-based)
    departure_location = models.CharField(
        _('departure location'),
        max_length=200,
        default='',
        blank=True,
        help_text=_('City or place name where the trip starts')
    )
    # Destinations (comma-separated text)
    destinations = models.TextField(
        _('destinations'),
        default='',
        blank=True,
        help_text=_('Places visited during the trip (one per line)')
    )

    # Driver languages
    driver_languages = models.CharField(
        _('driver languages'),
        max_length=500,
        blank=True,
        help_text=_('Comma-separated language codes (e.g., en,fr,ar,es)')
    )

    # Duration
    duration_hours = models.PositiveSmallIntegerField(
        _('duration (hours)'),
        null=True,
        blank=True
    )
    duration_days = models.PositiveSmallIntegerField(
        _('duration (days)'),
        default=1
    )

    # Capacity
    min_participants = models.PositiveSmallIntegerField(_('minimum participants'), default=1)
    max_participants = models.PositiveSmallIntegerField(_('maximum participants'), default=20)

    # Pricing
    pricing_model = models.CharField(
        _('pricing model'),
        max_length=20,
        choices=PricingModel.choices,
        default=PricingModel.PER_PERSON
    )
    price_per_person = models.DecimalField(
        _('price per person'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    child_price = models.DecimalField(
        _('child price'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Price for children under 12')
    )
    private_tour_price = models.DecimalField(
        _('private tour price'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Fixed price for private tour')
    )
    currency = models.CharField(_('currency'), max_length=3, default='MAD')

    # Included/Excluded
    inclusions = models.TextField(
        _('inclusions'),
        blank=True,
        help_text=_('What is included in the trip (one item per line)')
    )
    exclusions = models.TextField(
        _('exclusions'),
        blank=True,
        help_text=_('What is not included (one item per line)')
    )

    # Itinerary (legacy - keep for backwards compatibility)
    itinerary = models.TextField(
        _('itinerary'),
        blank=True,
        help_text=_('Detailed itinerary of the trip')
    )

    # Media
    featured_image = models.ImageField(
        _('featured image'),
        upload_to='trips/',
        blank=True,
        null=True
    )

    # Policies
    cancellation_policy = models.CharField(
        _('cancellation policy'),
        max_length=20,
        choices=CancellationPolicy.choices,
        default=CancellationPolicy.FLEXIBLE
    )
    booking_notice_hours = models.PositiveIntegerField(
        _('booking notice (hours)'),
        default=24,
        help_text=_('Minimum hours in advance required to book')
    )
    instant_confirmation = models.BooleanField(
        _('instant confirmation'),
        default=True
    )
    child_policy = models.TextField(
        _('child policy'),
        blank=True,
        help_text=_('Policy regarding children and age restrictions')
    )
    accessibility_info = models.TextField(
        _('accessibility info'),
        blank=True,
        help_text=_('Information about wheelchair access, mobility requirements, etc.')
    )

    # SEO
    meta_title = models.CharField(
        _('meta title'),
        max_length=70,
        blank=True,
        help_text=_('SEO title (max 70 characters)')
    )
    meta_description = models.CharField(
        _('meta description'),
        max_length=160,
        blank=True,
        help_text=_('SEO description (max 160 characters)')
    )
    meta_keywords = models.CharField(
        _('meta keywords'),
        max_length=255,
        blank=True,
        help_text=_('Comma-separated keywords')
    )

    # Status & Publishing
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    publish_date = models.DateTimeField(
        _('publish date'),
        null=True,
        blank=True
    )

    # Related tours
    related_trips = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=False,
        verbose_name=_('related tours')
    )

    # Settings
    is_active = models.BooleanField(_('active'), default=True)
    is_featured = models.BooleanField(_('featured'), default=False)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('trip')
        verbose_name_plural = _('trips')
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    @property
    def inclusions_list(self):
        return [i.strip() for i in self.inclusions.split('\n') if i.strip()]

    @property
    def exclusions_list(self):
        return [e.strip() for e in self.exclusions.split('\n') if e.strip()]

    @property
    def destinations_list(self):
        return [d.strip() for d in self.destinations.split('\n') if d.strip()]


class TripImage(models.Model):
    """Gallery images for trips."""

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name=_('trip')
    )
    image = models.ImageField(_('image'), upload_to='trips/')
    caption = models.CharField(_('caption'), max_length=200, blank=True)
    alt_text = models.CharField(_('alt text'), max_length=200, blank=True)
    is_thumbnail = models.BooleanField(_('use as thumbnail'), default=False)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    class Meta:
        verbose_name = _('trip image')
        verbose_name_plural = _('trip images')
        ordering = ['order']

    def __str__(self):
        return f"Image for {self.trip.name}"

    def save(self, *args, **kwargs):
        # Ensure only one thumbnail per trip
        if self.is_thumbnail:
            TripImage.objects.filter(trip=self.trip, is_thumbnail=True).exclude(pk=self.pk).update(is_thumbnail=False)
        super().save(*args, **kwargs)


class TripHighlight(models.Model):
    """Highlights/features for trips."""

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='highlights',
        verbose_name=_('trip')
    )
    icon = models.CharField(
        _('icon'),
        max_length=50,
        default='bi-check-circle',
        help_text=_('Bootstrap icon class (e.g., bi-check-circle)')
    )
    text = models.CharField(_('highlight text'), max_length=200)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    class Meta:
        verbose_name = _('trip highlight')
        verbose_name_plural = _('trip highlights')
        ordering = ['order']

    def __str__(self):
        return f"{self.trip.name}: {self.text[:50]}"


class TripItineraryStop(models.Model):
    """Itinerary stops for trips."""

    class StopType(models.TextChoices):
        START = 'start', _('Start Point')
        STOP = 'stop', _('Stop')
        END = 'end', _('End Point')

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='itinerary_stops',
        verbose_name=_('trip')
    )
    stop_type = models.CharField(
        _('stop type'),
        max_length=10,
        choices=StopType.choices,
        default=StopType.STOP
    )
    name = models.CharField(_('name'), max_length=200)
    location = models.CharField(_('location'), max_length=200, blank=True)
    description = models.TextField(_('description'), blank=True)
    duration_minutes = models.PositiveIntegerField(
        _('duration (minutes)'),
        null=True,
        blank=True
    )
    has_admission = models.BooleanField(
        _('admission included'),
        default=False,
        help_text=_('Check if admission fee is included')
    )
    pickup_flexibility = models.BooleanField(
        _('flexible pickup'),
        default=False,
        help_text=_('Allow custom pickup location')
    )
    same_as_start = models.BooleanField(
        _('same as start'),
        default=False,
        help_text=_('End point is the same as start point')
    )
    image = models.ImageField(
        _('image'),
        upload_to='trips/itinerary/',
        blank=True,
        null=True
    )
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    class Meta:
        verbose_name = _('itinerary stop')
        verbose_name_plural = _('itinerary stops')
        ordering = ['order']

    def __str__(self):
        return f"{self.trip.name}: {self.name}"


class TripPriceTier(models.Model):
    """Price tiers for tiered pricing model."""

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='price_tiers',
        verbose_name=_('trip')
    )
    name = models.CharField(
        _('tier name'),
        max_length=100,
        help_text=_('e.g., "1-2 persons", "3-5 persons"')
    )
    min_travelers = models.PositiveSmallIntegerField(_('minimum travelers'), default=1)
    max_travelers = models.PositiveSmallIntegerField(_('maximum travelers'), default=2)
    price_per_person = models.DecimalField(
        _('price per person'),
        max_digits=10,
        decimal_places=2
    )
    total_price = models.DecimalField(
        _('total price'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Auto-calculated or override')
    )
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    class Meta:
        verbose_name = _('price tier')
        verbose_name_plural = _('price tiers')
        ordering = ['order', 'min_travelers']

    def __str__(self):
        return f"{self.trip.name}: {self.name}"

    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if self.total_price is None:
            avg_travelers = (self.min_travelers + self.max_travelers) / 2
            self.total_price = self.price_per_person * avg_travelers
        super().save(*args, **kwargs)


class TripContentBlock(models.Model):
    """Rich content blocks for "What to Expect" section."""

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='content_blocks',
        verbose_name=_('trip')
    )
    title = models.CharField(_('title'), max_length=200)
    content = models.TextField(_('content'))
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    class Meta:
        verbose_name = _('content block')
        verbose_name_plural = _('content blocks')
        ordering = ['order']

    def __str__(self):
        return f"{self.trip.name}: {self.title}"


class TripFAQ(models.Model):
    """FAQ items for trips."""

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='faqs',
        verbose_name=_('trip')
    )
    question = models.CharField(_('question'), max_length=300)
    answer = models.TextField(_('answer'))
    order = models.PositiveSmallIntegerField(_('display order'), default=0)

    class Meta:
        verbose_name = _('FAQ')
        verbose_name_plural = _('FAQs')
        ordering = ['order']

    def __str__(self):
        return f"{self.trip.name}: {self.question[:50]}"


class TripSchedule(models.Model):
    """Available schedules for trips."""

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, _('Monday')
        TUESDAY = 1, _('Tuesday')
        WEDNESDAY = 2, _('Wednesday')
        THURSDAY = 3, _('Thursday')
        FRIDAY = 4, _('Friday')
        SATURDAY = 5, _('Saturday')
        SUNDAY = 6, _('Sunday')

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='schedules',
        verbose_name=_('trip')
    )

    # For specific date
    specific_date = models.DateField(
        _('specific date'),
        null=True,
        blank=True,
        help_text=_('Leave blank for recurring schedule')
    )

    # For recurring schedule
    day_of_week = models.IntegerField(
        _('day of week'),
        choices=DayOfWeek.choices,
        null=True,
        blank=True
    )

    departure_time = models.TimeField(_('departure time'))
    available_spots = models.PositiveSmallIntegerField(_('available spots'))
    is_active = models.BooleanField(_('active'), default=True)

    class Meta:
        verbose_name = _('trip schedule')
        verbose_name_plural = _('trip schedules')
        ordering = ['specific_date', 'day_of_week', 'departure_time']

    def __str__(self):
        if self.specific_date:
            return f"{self.trip.name} - {self.specific_date}"
        return f"{self.trip.name} - {self.get_day_of_week_display()}"


class TripBooking(models.Model):
    """Customer booking for a trip."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        CONFIRMED = 'confirmed', _('Confirmed')
        CANCELLED = 'cancelled', _('Cancelled')
        COMPLETED = 'completed', _('Completed')
        NO_SHOW = 'no_show', _('No Show')

    booking_ref = models.CharField(
        _('booking reference'),
        max_length=20,
        unique=True,
        editable=False
    )

    # Trip info
    trip = models.ForeignKey(
        Trip,
        on_delete=models.PROTECT,
        related_name='bookings',
        verbose_name=_('trip')
    )
    schedule = models.ForeignKey(
        TripSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        verbose_name=_('schedule')
    )
    trip_date = models.DateField(_('trip date'))

    # Customer info
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trip_bookings',
        verbose_name=_('customer')
    )
    customer_name = models.CharField(_('customer name'), max_length=200)
    customer_email = models.EmailField(_('customer email'))
    customer_phone = models.CharField(_('customer phone'), max_length=20)

    # Participants
    adults = models.PositiveSmallIntegerField(_('adults'), default=1)
    children = models.PositiveSmallIntegerField(_('children'), default=0)

    # Pickup (text-based address)
    pickup_address = models.TextField(_('pickup address'), blank=True)

    # Private tour option
    is_private = models.BooleanField(_('private tour'), default=False)

    # Pricing
    price_per_adult = models.DecimalField(_('price per adult'), max_digits=10, decimal_places=2)
    price_per_child = models.DecimalField(
        _('price per child'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    extras_price = models.DecimalField(_('extras price'), max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(_('discount'), max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(_('total price'), max_digits=10, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=3, default='MAD')

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    # Notes
    special_requests = models.TextField(_('special requests'), blank=True)
    internal_notes = models.TextField(_('internal notes'), blank=True)

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('trip booking')
        verbose_name_plural = _('trip bookings')
        ordering = ['-trip_date', '-created_at']

    def __str__(self):
        return f"{self.booking_ref} - {self.trip.name}"

    def save(self, *args, **kwargs):
        if not self.booking_ref:
            self.booking_ref = self.generate_booking_ref()
        if not self.total_price:
            self.total_price = self.calculate_total()
        super().save(*args, **kwargs)

    def generate_booking_ref(self):
        return f"TRP-{uuid.uuid4().hex[:8].upper()}"

    def calculate_total(self):
        adult_total = self.price_per_adult * self.adults
        child_total = self.price_per_child * self.children
        return adult_total + child_total + self.extras_price - self.discount

    @property
    def total_participants(self):
        return self.adults + self.children
