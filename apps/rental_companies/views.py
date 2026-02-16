import json
from datetime import timedelta
from decimal import Decimal

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.vehicles.models import Vehicle, VehicleCategory, VehicleFeature, VehicleImage
from apps.rentals.models import Rental
from .models import RentalCompany, CompanyDocument, CompanyReview, CompanyPayout, VehicleAvailability
from .decorators import rental_company_required


# ─── Portal Home ──────────────────────────────────────────────────────────────

@rental_company_required
def portal_home(request):
    """Company portal dashboard with stats and chart data."""
    company = request.company
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Core statistics
    active_vehicles = Vehicle.objects.filter(
        company=company,
        is_active=True,
        status='available',
    ).count()

    bookings_this_month = Rental.objects.filter(
        company=company,
        created_at__date__gte=month_start,
    ).count()

    revenue_this_month = Rental.objects.filter(
        company=company,
        status='completed',
        created_at__date__gte=month_start,
    ).aggregate(total=Sum('company_payout_amount'))['total'] or Decimal('0')

    pending_bookings = Rental.objects.filter(
        company=company,
        status='pending',
    ).count()

    stats = {
        'active_vehicles': active_vehicles,
        'bookings_this_month': bookings_this_month,
        'revenue_this_month': revenue_this_month,
        'pending_bookings': pending_bookings,
    }

    # Chart data – bookings per day for the last 30 days
    chart_data = []
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        count = Rental.objects.filter(
            company=company,
            created_at__date=day,
        ).count()
        chart_data.append({
            'date': day.strftime('%b %d'),
            'count': count,
        })

    # Recent bookings
    recent_bookings = Rental.objects.filter(
        company=company,
    ).select_related('vehicle').order_by('-created_at')[:10]

    context = {
        'active_nav': 'dashboard',
        'stats': stats,
        'chart_data': chart_data,
        'recent_bookings': recent_bookings,
    }
    return render(request, 'portal/home.html', context)


# ─── Vehicle Views ────────────────────────────────────────────────────────────

@rental_company_required
def vehicle_list(request):
    """List company vehicles with optional filters."""
    vehicles = Vehicle.objects.filter(
        company=request.company,
    ).select_related('category').prefetch_related('images')

    # Filters
    status = request.GET.get('status')
    category = request.GET.get('category')
    search = request.GET.get('search')

    if status:
        vehicles = vehicles.filter(status=status)
    if category:
        vehicles = vehicles.filter(category_id=category)
    if search:
        vehicles = vehicles.filter(
            Q(name__icontains=search) |
            Q(category__name__icontains=search)
        )

    categories = VehicleCategory.objects.filter(is_active=True)

    context = {
        'active_nav': 'fleet',
        'vehicles': vehicles,
        'categories': categories,
        'statuses': Vehicle.Status.choices,
    }
    return render(request, 'portal/vehicle_list.html', context)


@rental_company_required
def vehicle_create(request):
    """Create a new rental vehicle for this company."""
    if request.method == 'POST':
        category_id = request.POST.get('category')
        name = request.POST.get('name')
        passengers = request.POST.get('passengers')
        luggage = request.POST.get('luggage')

        if all([category_id, name, passengers, luggage]):
            try:
                # Parse key_features from hidden input
                key_features = []
                key_features_raw = request.POST.get('key_features', '[]')
                try:
                    key_features = json.loads(key_features_raw) if key_features_raw else []
                except (json.JSONDecodeError, ValueError):
                    pass

                vehicle = Vehicle.objects.create(
                    category_id=category_id,
                    name=name,
                    passengers=passengers,
                    luggage=luggage,
                    service_type='rental',
                    company=request.company,
                    is_available_for_rental_marketplace=True,
                    daily_rate=request.POST.get('daily_rate') or None,
                    weekly_rate=request.POST.get('weekly_rate') or None,
                    client_description=request.POST.get('client_description', ''),
                    key_features=key_features,
                    important_note=request.POST.get('important_note', ''),
                    important_note_type=request.POST.get('important_note_type', 'info'),
                    status='available',
                    is_active=True,
                )

                # Handle multiple image uploads
                images = request.FILES.getlist('images')
                for idx, image_file in enumerate(images):
                    VehicleImage.objects.create(
                        vehicle=vehicle,
                        image=image_file,
                        is_primary=(idx == 0),
                        order=idx,
                    )

                # Fallback: single image upload field
                if not images and request.FILES.get('image'):
                    VehicleImage.objects.create(
                        vehicle=vehicle,
                        image=request.FILES['image'],
                        is_primary=True,
                    )

                messages.success(request, f'Vehicle "{name}" created successfully.')
                return redirect('portal:vehicle_detail', pk=vehicle.pk)

            except Exception as e:
                messages.error(request, f'Error creating vehicle: {e}')
        else:
            messages.error(request, 'Please fill in all required fields.')

    categories = VehicleCategory.objects.filter(is_active=True)
    features = VehicleFeature.objects.filter(is_active=True)

    context = {
        'active_nav': 'fleet',
        'categories': categories,
        'features': features,
    }
    return render(request, 'portal/vehicle_create.html', context)


@rental_company_required
def vehicle_detail(request, pk):
    """Vehicle detail/edit view. Only allow editing company's own vehicles."""
    vehicle = get_object_or_404(
        Vehicle.objects.select_related('category').prefetch_related('features', 'images'),
        pk=pk,
        company=request.company,
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_vehicle':
            vehicle.category_id = request.POST.get('category', vehicle.category_id)
            vehicle.name = request.POST.get('name', vehicle.name)
            vehicle.passengers = request.POST.get('passengers', vehicle.passengers)
            vehicle.luggage = request.POST.get('luggage', vehicle.luggage)
            vehicle.status = request.POST.get('status', vehicle.status)
            vehicle.daily_rate = request.POST.get('daily_rate') or None
            vehicle.weekly_rate = request.POST.get('weekly_rate') or None
            vehicle.is_active = request.POST.get('is_active') == 'on'
            vehicle.client_description = request.POST.get('client_description', '')
            vehicle.important_note = request.POST.get('important_note', '')
            vehicle.important_note_type = request.POST.get('important_note_type', 'info')

            key_features_raw = request.POST.get('key_features', '[]')
            try:
                vehicle.key_features = json.loads(key_features_raw) if key_features_raw else []
            except (json.JSONDecodeError, ValueError):
                pass

            vehicle.save()
            messages.success(request, 'Vehicle updated successfully.')

        elif action == 'upload_image':
            image_file = request.FILES.get('image')
            if image_file:
                is_primary = request.POST.get('is_primary') == 'on'
                VehicleImage.objects.create(
                    vehicle=vehicle,
                    image=image_file,
                    is_primary=is_primary,
                )
                messages.success(request, 'Image uploaded successfully.')
            else:
                messages.error(request, 'Please select an image to upload.')

        elif action == 'delete_image':
            image_id = request.POST.get('image_id')
            image = get_object_or_404(VehicleImage, pk=image_id, vehicle=vehicle)
            image.delete()
            messages.success(request, 'Image deleted successfully.')

        elif action == 'set_primary_image':
            image_id = request.POST.get('image_id')
            image = get_object_or_404(VehicleImage, pk=image_id, vehicle=vehicle)
            # Unset current primaries, then set the new one
            vehicle.images.update(is_primary=False)
            image.is_primary = True
            image.save()
            messages.success(request, 'Primary image updated.')

        elif action == 'delete_vehicle':
            vehicle.is_active = False
            vehicle.status = 'inactive'
            vehicle.save()
            messages.success(request, f'Vehicle "{vehicle.name}" has been deactivated.')
            return redirect('portal:vehicle_list')

        return redirect('portal:vehicle_detail', pk=pk)

    categories = VehicleCategory.objects.filter(is_active=True)
    features = VehicleFeature.objects.filter(is_active=True)
    vehicle_images = vehicle.images.all().order_by('-is_primary', 'order', 'created_at')

    context = {
        'active_nav': 'fleet',
        'vehicle': vehicle,
        'categories': categories,
        'features': features,
        'vehicle_images': vehicle_images,
        'statuses': Vehicle.Status.choices,
    }
    return render(request, 'portal/vehicle_detail.html', context)


# ─── Vehicle Calendar / Availability ──────────────────────────────────────────

@rental_company_required
def vehicle_calendar(request, pk):
    """Show and manage vehicle availability blocks."""
    vehicle = get_object_or_404(
        Vehicle,
        pk=pk,
        company=request.company,
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'add_block':
            start_date = request.POST.get('start_date')
            end_date = request.POST.get('end_date')
            reason = request.POST.get('reason', 'unavailable')
            notes = request.POST.get('notes', '')

            if start_date and end_date:
                VehicleAvailability.objects.create(
                    vehicle=vehicle,
                    company=request.company,
                    start_date=start_date,
                    end_date=end_date,
                    reason=reason,
                    notes=notes,
                )
                messages.success(request, 'Availability block added.')
            else:
                messages.error(request, 'Start date and end date are required.')

        elif action == 'delete_block':
            block_id = request.POST.get('block_id')
            block = get_object_or_404(
                VehicleAvailability,
                pk=block_id,
                vehicle=vehicle,
                company=request.company,
            )
            block.delete()
            messages.success(request, 'Availability block removed.')

        return redirect('portal:vehicle_calendar', pk=pk)

    availability_blocks = vehicle.availability_blocks.filter(
        company=request.company,
    ).order_by('start_date')

    rental_bookings = Rental.objects.filter(
        vehicle=vehicle,
        company=request.company,
        status__in=['confirmed', 'active'],
    ).order_by('pickup_date')

    # Serialize for JS calendar
    bookings_json = json.dumps([
        {'start': str(b.pickup_date), 'end': str(b.return_date)}
        for b in rental_bookings
    ])
    blocks_json = json.dumps([
        {'start': str(b.start_date), 'end': str(b.end_date)}
        for b in availability_blocks
    ])

    context = {
        'active_nav': 'fleet',
        'vehicle': vehicle,
        'availability_blocks': availability_blocks,
        'rental_bookings': rental_bookings,
        'bookings_json': bookings_json,
        'blocks_json': blocks_json,
        'reasons': VehicleAvailability.Reason.choices,
    }
    return render(request, 'portal/vehicle_calendar.html', context)


# ─── Booking Views ────────────────────────────────────────────────────────────

@rental_company_required
def booking_list(request):
    """List company's rental bookings with filters and pagination."""
    bookings = Rental.objects.filter(
        company=request.company,
    ).select_related('vehicle').order_by('-created_at')

    # Filters
    status = request.GET.get('status')
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    search = request.GET.get('search')

    if status:
        bookings = bookings.filter(status=status)
    if date_from:
        bookings = bookings.filter(pickup_date__gte=date_from)
    if date_to:
        bookings = bookings.filter(pickup_date__lte=date_to)
    if search:
        bookings = bookings.filter(
            Q(booking_ref__icontains=search) |
            Q(customer_name__icontains=search)
        )

    paginator = Paginator(bookings, 20)
    page = request.GET.get('page')
    bookings = paginator.get_page(page)

    context = {
        'active_nav': 'bookings',
        'bookings': bookings,
        'statuses': Rental.Status.choices,
    }
    return render(request, 'portal/booking_list.html', context)


@rental_company_required
def booking_detail(request, pk):
    """Show and manage a single rental booking."""
    booking = get_object_or_404(
        Rental.objects.select_related('vehicle', 'insurance').prefetch_related('booked_extras'),
        pk=pk,
        company=request.company,
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'confirm_booking':
            if booking.status == 'pending':
                booking.status = 'confirmed'
                booking.save()
                messages.success(request, 'Booking confirmed.')

        elif action == 'start_rental':
            if booking.status == 'confirmed':
                booking.status = 'active'
                booking.save()
                messages.success(request, 'Rental started.')

        elif action == 'complete_rental':
            if booking.status == 'active':
                booking.status = 'completed'
                booking.actual_return_date = timezone.now().date()
                booking.save()
                messages.success(request, 'Rental completed.')

        elif action == 'cancel_booking':
            if booking.status in ('pending', 'confirmed'):
                booking.status = 'cancelled'
                booking.cancellation_reason = request.POST.get('cancellation_reason', '')
                booking.save()
                messages.success(request, 'Booking cancelled.')

        elif action == 'update_company_notes':
            booking.company_notes = request.POST.get('company_notes', '')
            booking.save()
            messages.success(request, 'Notes updated.')

        return redirect('portal:booking_detail', pk=pk)

    context = {
        'active_nav': 'bookings',
        'booking': booking,
    }
    return render(request, 'portal/booking_detail.html', context)


# ─── Earnings ─────────────────────────────────────────────────────────────────

@rental_company_required
def earnings(request):
    """Earnings summary with totals, monthly breakdown, and payouts."""
    company = request.company

    completed_bookings = Rental.objects.filter(
        company=company,
        status='completed',
    )

    # Overall totals
    totals = completed_bookings.aggregate(
        gross_total=Sum('total_price'),
        commission_total=Sum('commission_amount'),
        net_total=Sum('company_payout_amount'),
    )
    gross_total = totals['gross_total'] or Decimal('0')
    commission_total = totals['commission_total'] or Decimal('0')
    net_total = totals['net_total'] or Decimal('0')

    # Monthly breakdown
    monthly_breakdown = completed_bookings.annotate(
        month=TruncMonth('created_at'),
    ).values('month').annotate(
        gross=Sum('total_price'),
        commission=Sum('commission_amount'),
        net=Sum('company_payout_amount'),
        booking_count=Count('id'),
    ).order_by('-month')

    # Payouts
    payouts = CompanyPayout.objects.filter(company=company).order_by('-period_end')

    context = {
        'active_nav': 'earnings',
        'gross_total': gross_total,
        'commission_total': commission_total,
        'net_total': net_total,
        'monthly_breakdown': monthly_breakdown,
        'payouts': payouts,
    }
    return render(request, 'portal/earnings.html', context)


# ─── Reviews ──────────────────────────────────────────────────────────────────

@rental_company_required
def reviews(request):
    """List company reviews and allow responding."""
    company = request.company

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'respond_to_review':
            review_id = request.POST.get('review_id')
            review = get_object_or_404(CompanyReview, pk=review_id, company=company)
            review.company_response = request.POST.get('company_response', '')
            review.company_responded_at = timezone.now()
            review.save()
            messages.success(request, 'Response saved.')
            return redirect('portal:reviews')

    review_list = CompanyReview.objects.filter(company=company).order_by('-created_at')

    context = {
        'active_nav': 'reviews',
        'reviews': review_list,
    }
    return render(request, 'portal/reviews.html', context)


# ─── Company Profile ──────────────────────────────────────────────────────────

@rental_company_required
def profile(request):
    """View and update company profile."""
    company = request.company

    if request.method == 'POST':
        company.company_name = request.POST.get('company_name', company.company_name)
        company.description = request.POST.get('description', '')
        company.short_description = request.POST.get('short_description', '')
        company.phone = request.POST.get('phone', company.phone)
        company.email = request.POST.get('email', company.email)
        company.whatsapp = request.POST.get('whatsapp', '')
        company.website = request.POST.get('website', '')
        company.address = request.POST.get('address', company.address)
        company.city = request.POST.get('city', company.city)
        company.region = request.POST.get('region', '')
        company.postal_code = request.POST.get('postal_code', '')

        # JSON fields
        operating_hours_raw = request.POST.get('operating_hours', '{}')
        try:
            company.operating_hours = json.loads(operating_hours_raw) if operating_hours_raw else {}
        except (json.JSONDecodeError, ValueError):
            pass

        pickup_cities_raw = request.POST.get('pickup_cities', '[]')
        try:
            company.pickup_cities = json.loads(pickup_cities_raw) if pickup_cities_raw else []
        except (json.JSONDecodeError, ValueError):
            pass

        # Boolean / numeric capabilities
        company.offers_delivery = request.POST.get('offers_delivery') == 'on'
        company.delivery_fee = request.POST.get('delivery_fee') or 0
        company.delivery_radius_km = request.POST.get('delivery_radius_km') or 0
        company.offers_airport_pickup = request.POST.get('offers_airport_pickup') == 'on'
        company.minimum_rental_days = request.POST.get('minimum_rental_days') or 1
        company.maximum_rental_days = request.POST.get('maximum_rental_days') or 30
        company.minimum_driver_age = request.POST.get('minimum_driver_age') or 21

        # File uploads
        if request.FILES.get('logo'):
            company.logo = request.FILES['logo']
        if request.FILES.get('cover_image'):
            company.cover_image = request.FILES['cover_image']

        company.save()
        messages.success(request, 'Profile updated successfully.')
        return redirect('portal:profile')

    context = {
        'active_nav': 'profile',
        'company': company,
    }
    return render(request, 'portal/profile.html', context)


# ─── Documents ────────────────────────────────────────────────────────────────

@rental_company_required
def documents(request):
    """List and upload company documents."""
    company = request.company

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'upload_document':
            file = request.FILES.get('file')
            document_type = request.POST.get('document_type')
            name = request.POST.get('name', '')
            expiry_date = request.POST.get('expiry_date') or None

            if file and document_type:
                CompanyDocument.objects.create(
                    company=company,
                    document_type=document_type,
                    file=file,
                    name=name or file.name,
                    expiry_date=expiry_date,
                )
                messages.success(request, 'Document uploaded successfully.')
            else:
                messages.error(request, 'Please select a file and document type.')

            return redirect('portal:documents')

    document_list = CompanyDocument.objects.filter(company=company)

    context = {
        'active_nav': 'documents',
        'documents': document_list,
        'document_types': CompanyDocument.DocType.choices,
    }
    return render(request, 'portal/documents.html', context)


# ─── Authentication ───────────────────────────────────────────────────────────

def portal_login(request):
    """Login view for rental companies."""
    if request.user.is_authenticated and getattr(request.user, 'role', None) == 'rental_company':
        return redirect('portal:home')

    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, email=email, password=password)

        if user is not None and user.role == 'rental_company':
            login(request, user)
            next_url = request.GET.get('next', 'portal:home')
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid credentials or this account is not a rental company.')

    return render(request, 'portal/login.html')


def portal_logout(request):
    """Logout and redirect to portal login."""
    logout(request)
    return redirect('portal:login')
