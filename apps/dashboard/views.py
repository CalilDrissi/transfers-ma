from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from django.core.paginator import Paginator
from django.http import JsonResponse
from datetime import timedelta
from decimal import Decimal

from apps.accounts.models import User, SiteSettings
from apps.accounts.api_keys import APIKey
from apps.transfers.models import Transfer
from apps.trips.models import (
    TripBooking, Trip, TripImage, TripHighlight, TripItineraryStop,
    TripPriceTier, TripContentBlock, TripFAQ
)
from apps.rentals.models import Rental
from apps.vehicles.models import Vehicle, VehicleCategory, VehicleFeature, VehicleZonePricing, VehicleImage
from apps.locations.models import Zone, ZoneDistanceRange, Route, VehicleRoutePricing, RoutePickupZone, RouteDropoffZone
from apps.payments.models import Payment, Coupon


def is_admin(user):
    return user.is_authenticated and (user.is_staff or user.role in ['admin', 'manager'])


def login_view(request):
    """Dashboard login view."""
    if request.user.is_authenticated and is_admin(request.user):
        return redirect('dashboard:home')

    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, email=email, password=password)

        if user is not None and is_admin(user):
            login(request, user)
            next_url = request.GET.get('next', 'dashboard:home')
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid credentials or insufficient permissions.')

    return render(request, 'dashboard/login.html')


def logout_view(request):
    """Logout view."""
    logout(request)
    return redirect('dashboard:login')


@login_required
@user_passes_test(is_admin)
def home(request):
    """Dashboard home with statistics."""
    today = timezone.now().date()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    # Transfer stats
    transfers_today = Transfer.objects.filter(created_at__date=today).count()
    transfers_month = Transfer.objects.filter(created_at__date__gte=month_start).count()
    pending_transfers = Transfer.objects.filter(status='pending').count()

    # Trip booking stats
    trips_today = TripBooking.objects.filter(created_at__date=today).count()
    trips_month = TripBooking.objects.filter(created_at__date__gte=month_start).count()

    # Rental stats
    rentals_today = Rental.objects.filter(created_at__date=today).count()
    rentals_month = Rental.objects.filter(created_at__date__gte=month_start).count()
    active_rentals = Rental.objects.filter(status='active').count()

    # Revenue stats
    revenue_today = Payment.objects.filter(
        status='completed',
        completed_at__date=today
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    revenue_month = Payment.objects.filter(
        status='completed',
        completed_at__date__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Recent bookings
    recent_transfers = Transfer.objects.select_related(
        'vehicle_category'
    ).order_by('-created_at')[:5]

    recent_trips = TripBooking.objects.select_related('trip').order_by('-created_at')[:5]
    recent_rentals = Rental.objects.select_related('vehicle').order_by('-created_at')[:5]

    # Chart data - last 7 days bookings
    last_7_days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    daily_bookings = []
    for day in last_7_days:
        count = (
            Transfer.objects.filter(created_at__date=day).count() +
            TripBooking.objects.filter(created_at__date=day).count() +
            Rental.objects.filter(created_at__date=day).count()
        )
        daily_bookings.append({
            'date': day.strftime('%b %d'),
            'count': count
        })

    context = {
        'transfers_today': transfers_today,
        'transfers_month': transfers_month,
        'pending_transfers': pending_transfers,
        'trips_today': trips_today,
        'trips_month': trips_month,
        'rentals_today': rentals_today,
        'rentals_month': rentals_month,
        'active_rentals': active_rentals,
        'revenue_today': revenue_today,
        'revenue_month': revenue_month,
        'recent_transfers': recent_transfers,
        'recent_trips': recent_trips,
        'recent_rentals': recent_rentals,
        'daily_bookings': daily_bookings,
    }

    return render(request, 'dashboard/home.html', context)


# Transfer Views
@login_required
@user_passes_test(is_admin)
def transfer_list(request):
    """List all transfers."""
    transfers = Transfer.objects.select_related(
        'vehicle_category', 'driver'
    ).order_by('-created_at')

    # Filters
    status = request.GET.get('status')
    transfer_type = request.GET.get('type')
    search = request.GET.get('search')

    if status:
        transfers = transfers.filter(status=status)
    if transfer_type:
        transfers = transfers.filter(transfer_type=transfer_type)
    if search:
        transfers = transfers.filter(
            Q(booking_ref__icontains=search) |
            Q(customer_name__icontains=search) |
            Q(customer_email__icontains=search) |
            Q(pickup_address__icontains=search) |
            Q(dropoff_address__icontains=search)
        )

    paginator = Paginator(transfers, 20)
    page = request.GET.get('page')
    transfers = paginator.get_page(page)

    context = {
        'transfers': transfers,
        'statuses': Transfer.Status.choices,
        'types': Transfer.TransferType.choices,
    }
    return render(request, 'dashboard/transfers/list.html', context)


@login_required
@user_passes_test(is_admin)
def transfer_detail(request, pk):
    """Transfer detail view."""
    transfer = get_object_or_404(
        Transfer.objects.select_related(
            'vehicle_category', 'vehicle', 'driver', 'customer'
        ),
        pk=pk
    )

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'update_status':
            transfer.status = request.POST.get('status')
            transfer.save()
            messages.success(request, 'Status updated successfully.')
        elif action == 'assign_driver':
            driver_id = request.POST.get('driver_id')
            vehicle_id = request.POST.get('vehicle_id')
            if driver_id:
                transfer.driver_id = driver_id
            if vehicle_id:
                transfer.vehicle_id = vehicle_id
            transfer.status = 'assigned'
            transfer.save()
            messages.success(request, 'Driver assigned successfully.')

    drivers = User.objects.filter(role='driver', is_active=True)
    vehicles = Vehicle.objects.filter(
        category=transfer.vehicle_category,
        status='available',
        is_active=True
    )

    context = {
        'transfer': transfer,
        'drivers': drivers,
        'vehicles': vehicles,
        'statuses': Transfer.Status.choices,
    }
    return render(request, 'dashboard/transfers/detail.html', context)


# Trip Views
@login_required
@user_passes_test(is_admin)
def trip_list(request):
    """List all trips."""
    trips = Trip.objects.all().order_by('order', 'name')

    context = {
        'trips': trips,
    }
    return render(request, 'dashboard/trips/list.html', context)


@login_required
@user_passes_test(is_admin)
def trip_booking_list(request):
    """List all trip bookings."""
    bookings = TripBooking.objects.select_related('trip', 'customer').order_by('-created_at')

    # Filters
    status = request.GET.get('status')
    search = request.GET.get('search')

    if status:
        bookings = bookings.filter(status=status)
    if search:
        bookings = bookings.filter(
            Q(booking_ref__icontains=search) |
            Q(customer_name__icontains=search)
        )

    paginator = Paginator(bookings, 20)
    page = request.GET.get('page')
    bookings = paginator.get_page(page)

    context = {
        'bookings': bookings,
        'statuses': TripBooking.Status.choices,
    }
    return render(request, 'dashboard/trips/bookings.html', context)


# Rental Views
@login_required
@user_passes_test(is_admin)
def rental_list(request):
    """List all rentals."""
    rentals = Rental.objects.select_related(
        'vehicle', 'customer'
    ).order_by('-created_at')

    # Filters
    status = request.GET.get('status')
    search = request.GET.get('search')

    if status:
        rentals = rentals.filter(status=status)
    if search:
        rentals = rentals.filter(
            Q(booking_ref__icontains=search) |
            Q(customer_name__icontains=search) |
            Q(pickup_location__icontains=search) |
            Q(return_location__icontains=search)
        )

    paginator = Paginator(rentals, 20)
    page = request.GET.get('page')
    rentals = paginator.get_page(page)

    context = {
        'rentals': rentals,
        'statuses': Rental.Status.choices,
    }
    return render(request, 'dashboard/rentals/list.html', context)


@login_required
@user_passes_test(is_admin)
def rental_detail(request, pk):
    """Rental detail view."""
    rental = get_object_or_404(
        Rental.objects.select_related('vehicle', 'customer'),
        pk=pk
    )

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'update_status':
            rental.status = request.POST.get('status')
            rental.save()
            messages.success(request, 'Status updated successfully.')

    context = {
        'rental': rental,
        'statuses': Rental.Status.choices,
    }
    return render(request, 'dashboard/rentals/detail.html', context)


# Vehicle Views
@login_required
@user_passes_test(is_admin)
def transfer_vehicle_list(request):
    """List transfer vehicles."""
    vehicles = Vehicle.objects.select_related('category').prefetch_related('features', 'images').filter(
        service_type='transfer'
    )

    # Filters
    category = request.GET.get('category')
    status = request.GET.get('status')

    if category:
        vehicles = vehicles.filter(category_id=category)
    if status:
        vehicles = vehicles.filter(status=status)

    categories = VehicleCategory.objects.filter(is_active=True)

    context = {
        'vehicles': vehicles,
        'categories': categories,
        'statuses': Vehicle.Status.choices,
        'service_type': 'transfer',
    }
    return render(request, 'dashboard/vehicles/transfer_list.html', context)


@login_required
@user_passes_test(is_admin)
def rental_vehicle_list(request):
    """List rental vehicles."""
    vehicles = Vehicle.objects.select_related('category').prefetch_related('features', 'images').filter(
        service_type='rental'
    )

    # Filters
    category = request.GET.get('category')
    status = request.GET.get('status')

    if category:
        vehicles = vehicles.filter(category_id=category)
    if status:
        vehicles = vehicles.filter(status=status)

    categories = VehicleCategory.objects.filter(is_active=True)

    context = {
        'vehicles': vehicles,
        'categories': categories,
        'statuses': Vehicle.Status.choices,
        'service_type': 'rental',
    }
    return render(request, 'dashboard/vehicles/rental_list.html', context)


@login_required
@user_passes_test(is_admin)
def vehicle_create(request, service_type='transfer'):
    """Create a new vehicle."""
    if service_type not in ['transfer', 'rental']:
        service_type = 'transfer'

    if request.method == 'POST':
        category_id = request.POST.get('category')
        name = request.POST.get('name')
        passengers = request.POST.get('passengers')
        luggage = request.POST.get('luggage')
        supplier_name = request.POST.get('supplier_name', '')
        daily_rate = request.POST.get('daily_rate') or None
        weekly_rate = request.POST.get('weekly_rate') or None

        if all([category_id, name, passengers, luggage]):
            try:
                import json as json_mod
                custom_info = {}
                custom_info_raw = request.POST.get('custom_info', '{}')
                try:
                    custom_info = json_mod.loads(custom_info_raw) if custom_info_raw else {}
                except (json_mod.JSONDecodeError, ValueError):
                    pass

                vehicle = Vehicle.objects.create(
                    category_id=category_id,
                    name=name,
                    passengers=passengers,
                    luggage=luggage,
                    supplier_name=supplier_name,
                    daily_rate=daily_rate,
                    weekly_rate=weekly_rate,
                    service_type=service_type,
                    custom_info=custom_info,
                    status='available',
                    is_active=True
                )
                # Save uploaded image
                if request.FILES.get('image'):
                    VehicleImage.objects.create(
                        vehicle=vehicle,
                        image=request.FILES['image'],
                        is_primary=True
                    )

                # Save zone pricing for transfer vehicles
                if service_type == 'transfer':
                    for key, value in request.POST.items():
                        if key.startswith('zone_price_') and value:
                            range_id = key.replace('zone_price_', '')
                            cost_value = request.POST.get(f'zone_cost_{range_id}') or None
                            min_hours = request.POST.get(f'zone_min_hours_{range_id}') or None
                            try:
                                VehicleZonePricing.objects.create(
                                    vehicle=vehicle,
                                    zone_distance_range_id=range_id,
                                    price=value,
                                    cost=cost_value,
                                    min_booking_hours=min_hours,
                                    is_active=True
                                )
                            except Exception:
                                pass

                    # Save route pricing for transfer vehicles
                    # New format: route_price_{route_id}_{pickup_zone_id}_{dropoff_zone_id}
                    # Where 0 means "any/default" (null in database)
                    import re
                    route_zone_pattern = re.compile(r'route_price_(\d+)_(\d+)_(\d+)')

                    for key, value in request.POST.items():
                        match = route_zone_pattern.match(key)
                        if match and value:
                            route_id, pickup_zone_id, dropoff_zone_id = match.groups()
                            cost_key = f'route_cost_{route_id}_{pickup_zone_id}_{dropoff_zone_id}'
                            min_hours_key = f'route_min_hours_{route_id}_{pickup_zone_id}_{dropoff_zone_id}'
                            cost_value = request.POST.get(cost_key) or None
                            min_hours = request.POST.get(min_hours_key) or None
                            try:
                                VehicleRoutePricing.objects.create(
                                    vehicle=vehicle,
                                    route_id=route_id,
                                    pickup_zone_id=int(pickup_zone_id) if pickup_zone_id != '0' else None,
                                    dropoff_zone_id=int(dropoff_zone_id) if dropoff_zone_id != '0' else None,
                                    price=value,
                                    cost=cost_value,
                                    min_booking_hours=min_hours,
                                    is_active=True
                                )
                            except Exception:
                                pass

                messages.success(request, f'Vehicle "{name}" created successfully.')
                if service_type == 'rental':
                    return redirect('dashboard:rental_vehicle_list')
                return redirect('dashboard:transfer_vehicle_list')
            except Exception as e:
                messages.error(request, f'Error creating vehicle: {e}')
        else:
            messages.error(request, 'Please fill in all required fields.')

    categories = VehicleCategory.objects.filter(is_active=True)
    features = VehicleFeature.objects.filter(is_active=True)

    # Get zones and routes for transfer vehicles
    zones = Zone.objects.prefetch_related('distance_ranges').filter(is_active=True)
    routes = Route.objects.filter(is_active=True).prefetch_related(
        'pickup_zones', 'dropoff_zones'
    ).order_by('order', 'name')

    context = {
        'categories': categories,
        'features': features,
        'service_type': service_type,
        'zones': zones,
        'routes': routes,
    }
    return render(request, 'dashboard/vehicles/create.html', context)


@login_required
@user_passes_test(is_admin)
def vehicle_detail(request, pk):
    """Vehicle detail/edit view."""
    vehicle = get_object_or_404(
        Vehicle.objects.select_related('category').prefetch_related('features', 'images', 'zone_pricing__zone_distance_range__zone'),
        pk=pk
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_vehicle':
            import json as json_mod
            vehicle.category_id = request.POST.get('category')
            vehicle.name = request.POST.get('name')
            vehicle.passengers = request.POST.get('passengers')
            vehicle.luggage = request.POST.get('luggage')
            vehicle.supplier_name = request.POST.get('supplier_name', '')
            vehicle.status = request.POST.get('status')
            vehicle.daily_rate = request.POST.get('daily_rate') or None
            vehicle.weekly_rate = request.POST.get('weekly_rate') or None
            vehicle.is_active = request.POST.get('is_active') == 'on'
            vehicle.notes = request.POST.get('notes', '')
            custom_info_raw = request.POST.get('custom_info', '{}')
            try:
                vehicle.custom_info = json_mod.loads(custom_info_raw) if custom_info_raw else {}
            except (json_mod.JSONDecodeError, ValueError):
                pass

            vehicle.save()
            messages.success(request, 'Vehicle updated successfully.')

        elif action == 'add_zone_pricing':
            zone_distance_range_id = request.POST.get('zone_distance_range')
            price = request.POST.get('price')
            cost = request.POST.get('cost') or None
            min_booking_hours = request.POST.get('min_booking_hours') or None

            if zone_distance_range_id and price:
                try:
                    VehicleZonePricing.objects.create(
                        vehicle=vehicle,
                        zone_distance_range_id=zone_distance_range_id,
                        price=price,
                        cost=cost,
                        min_booking_hours=min_booking_hours,
                        is_active=True
                    )
                    messages.success(request, 'Zone pricing added successfully.')
                except Exception as e:
                    messages.error(request, f'Error adding pricing: {e}')
            else:
                messages.error(request, 'Please select a zone range and enter a price.')

        elif action == 'update_zone_pricing':
            pricing_id = request.POST.get('pricing_id')
            pricing = get_object_or_404(VehicleZonePricing, pk=pricing_id, vehicle=vehicle)
            pricing.price = request.POST.get('price', pricing.price)
            pricing.cost = request.POST.get('cost') or None
            pricing.min_booking_hours = request.POST.get('min_booking_hours') or None
            pricing.save()
            messages.success(request, 'Zone pricing updated successfully.')

        elif action == 'delete_zone_pricing':
            pricing_id = request.POST.get('pricing_id')
            pricing = get_object_or_404(VehicleZonePricing, pk=pricing_id, vehicle=vehicle)
            pricing.delete()
            messages.success(request, 'Zone pricing deleted successfully.')

        elif action == 'add_route_pricing':
            route_id = request.POST.get('route_id')
            price = request.POST.get('price')
            cost = request.POST.get('cost') or None
            min_booking_hours = request.POST.get('min_booking_hours') or None

            if route_id and price:
                try:
                    VehicleRoutePricing.objects.create(
                        vehicle=vehicle,
                        route_id=route_id,
                        price=price,
                        cost=cost,
                        min_booking_hours=min_booking_hours,
                        is_active=True
                    )
                    messages.success(request, 'Route pricing added successfully.')
                except Exception as e:
                    messages.error(request, f'Error adding route pricing: {e}')
            else:
                messages.error(request, 'Please select a route and enter a price.')

        elif action == 'update_route_pricing':
            pricing_id = request.POST.get('pricing_id')
            pricing = get_object_or_404(VehicleRoutePricing, pk=pricing_id, vehicle=vehicle)
            pricing.price = request.POST.get('price', pricing.price)
            pricing.cost = request.POST.get('cost') or None
            pricing.min_booking_hours = request.POST.get('min_booking_hours') or None
            pricing.save()
            messages.success(request, 'Route pricing updated successfully.')

        elif action == 'delete_route_pricing':
            pricing_id = request.POST.get('pricing_id')
            pricing = get_object_or_404(VehicleRoutePricing, pk=pricing_id, vehicle=vehicle)
            pricing.delete()
            messages.success(request, 'Route pricing deleted successfully.')

        elif action == 'upload_image':
            image_file = request.FILES.get('image')
            if image_file:
                is_primary = request.POST.get('is_primary') == 'on'
                VehicleImage.objects.create(
                    vehicle=vehicle,
                    image=image_file,
                    is_primary=is_primary
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
            image.is_primary = True
            image.save()
            messages.success(request, 'Primary image updated.')

        elif action == 'delete_vehicle':
            vehicle_name = vehicle.name
            service_type = vehicle.service_type
            vehicle.delete()
            messages.success(request, f'Vehicle "{vehicle_name}" deleted successfully.')
            if service_type == 'rental':
                return redirect('dashboard:rental_vehicle_list')
            return redirect('dashboard:transfer_vehicle_list')

        if vehicle.service_type == 'rental':
            return redirect('dashboard:rental_vehicle_detail', pk=pk)
        return redirect('dashboard:transfer_vehicle_detail', pk=pk)

    categories = VehicleCategory.objects.filter(is_active=True)
    features = VehicleFeature.objects.filter(is_active=True)

    # Get zone pricing and route pricing for transfer vehicles
    zone_pricing = None
    available_ranges = None
    route_pricing = None
    available_routes = None
    if vehicle.service_type == 'transfer':
        zone_pricing = vehicle.zone_pricing.select_related(
            'zone_distance_range__zone'
        ).filter(is_active=True).order_by('zone_distance_range__zone__name', 'zone_distance_range__min_km')

        # Get all zone distance ranges for the dropdown
        zone_ranges = ZoneDistanceRange.objects.select_related('zone').filter(
            is_active=True
        ).order_by('zone__name', 'min_km')

        # Get existing pricing IDs to exclude from dropdown
        existing_range_ids = vehicle.zone_pricing.values_list('zone_distance_range_id', flat=True)
        available_ranges = zone_ranges.exclude(id__in=existing_range_ids)

        # Get route pricing for this vehicle
        route_pricing = vehicle.route_pricing.select_related('route').filter(
            is_active=True
        ).order_by('route__name')

        # Get all active routes for the dropdown
        all_routes = Route.objects.filter(is_active=True).order_by('order', 'name')

        # Get existing route pricing IDs to exclude from dropdown
        existing_route_ids = vehicle.route_pricing.values_list('route_id', flat=True)
        available_routes = all_routes.exclude(id__in=existing_route_ids)

    # Get vehicle images
    vehicle_images = vehicle.images.all().order_by('-is_primary', 'order', 'created_at')

    context = {
        'vehicle': vehicle,
        'categories': categories,
        'features': features,
        'statuses': Vehicle.Status.choices,
        'zone_pricing': zone_pricing,
        'available_ranges': available_ranges,
        'route_pricing': route_pricing,
        'available_routes': available_routes,
        'vehicle_images': vehicle_images,
    }
    return render(request, 'dashboard/vehicles/detail.html', context)


# Vehicle Category Views
@login_required
@user_passes_test(is_admin)
def vehicle_category_list(request):
    """List all vehicle categories."""
    categories = VehicleCategory.objects.annotate(
        vehicle_count=Count('vehicles')
    ).order_by('order', 'name')

    context = {
        'categories': categories,
    }
    return render(request, 'dashboard/vehicles/category_list.html', context)


@login_required
@user_passes_test(is_admin)
def vehicle_category_create(request):
    """Create a new vehicle category."""
    from django.utils.text import slugify

    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        max_passengers = request.POST.get('max_passengers', 4)
        max_luggage = request.POST.get('max_luggage', 3)
        price_multiplier = request.POST.get('price_multiplier', '1.00')
        icon = request.POST.get('icon', '')
        order = request.POST.get('order', 0)

        if name:
            slug = slugify(name)
            base_slug = slug
            counter = 1
            while VehicleCategory.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            category = VehicleCategory.objects.create(
                name=name,
                slug=slug,
                description=description,
                max_passengers=max_passengers,
                max_luggage=max_luggage,
                price_multiplier=price_multiplier,
                icon=icon,
                order=order,
                is_active=True
            )
            messages.success(request, f'Category "{name}" created successfully.')
            return redirect('dashboard:vehicle_category_detail', pk=category.pk)
        else:
            messages.error(request, 'Category name is required.')

    return render(request, 'dashboard/vehicles/category_create.html')


@login_required
@user_passes_test(is_admin)
def vehicle_category_detail(request, pk):
    """Vehicle category detail."""
    category = get_object_or_404(VehicleCategory, pk=pk)

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_category':
            category.name = request.POST.get('name', category.name)
            category.description = request.POST.get('description', '')
            category.max_passengers = request.POST.get('max_passengers', category.max_passengers)
            category.max_luggage = request.POST.get('max_luggage', category.max_luggage)
            category.price_multiplier = request.POST.get('price_multiplier', category.price_multiplier)
            category.icon = request.POST.get('icon', '')
            category.order = request.POST.get('order', 0)
            category.is_active = request.POST.get('is_active') == 'on'
            category.save()
            messages.success(request, 'Category updated successfully.')

        elif action == 'delete_category':
            category_name = category.name
            category.delete()
            messages.success(request, f'Category "{category_name}" deleted successfully.')
            return redirect('dashboard:vehicle_category_list')

        return redirect('dashboard:vehicle_category_detail', pk=pk)

    # Get vehicles in this category
    vehicles = category.vehicles.all()

    context = {
        'category': category,
        'vehicles': vehicles,
    }
    return render(request, 'dashboard/vehicles/category_detail.html', context)


# Zone Views
@login_required
@user_passes_test(is_admin)
def zone_list(request):
    """List all zones with their distance ranges."""
    zones = Zone.objects.prefetch_related('distance_ranges').order_by('name')

    context = {
        'zones': zones,
    }
    return render(request, 'dashboard/zones/list.html', context)


@login_required
@user_passes_test(is_admin)
def zone_create(request):
    """Create a new zone."""
    from django.utils.text import slugify

    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        color = request.POST.get('color', '#3498db')

        if name:
            slug = slugify(name)
            # Ensure unique slug
            base_slug = slug
            counter = 1
            while Zone.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            # Parse custom_info JSON
            import json
            custom_info = {}
            custom_info_raw = request.POST.get('custom_info', '{}')
            try:
                custom_info = json.loads(custom_info_raw) if custom_info_raw else {}
            except (json.JSONDecodeError, ValueError):
                pass

            zone = Zone.objects.create(
                name=name,
                slug=slug,
                description=description,
                color=color,
                deposit_percentage=request.POST.get('deposit_percentage', 0) or 0,
                custom_info=custom_info,
                is_active=True
            )
            messages.success(request, f'Zone "{name}" created successfully.')
            return redirect('dashboard:zone_detail', pk=zone.pk)
        else:
            messages.error(request, 'Zone name is required.')

    return render(request, 'dashboard/zones/create.html')


@login_required
@user_passes_test(is_admin)
def zone_detail(request, pk):
    """Zone detail view with distance ranges and map."""
    zone = get_object_or_404(Zone.objects.prefetch_related('distance_ranges'), pk=pk)

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_zone':
            import json
            zone.name = request.POST.get('name', zone.name)
            zone.description = request.POST.get('description', '')
            zone.color = request.POST.get('color', zone.color)
            zone.deposit_percentage = request.POST.get('deposit_percentage', 0) or 0
            zone.is_active = request.POST.get('is_active') == 'on'
            custom_info_raw = request.POST.get('custom_info', '{}')
            try:
                zone.custom_info = json.loads(custom_info_raw) if custom_info_raw else {}
            except (json.JSONDecodeError, ValueError):
                pass
            zone.save()
            messages.success(request, 'Zone updated successfully.')

        elif action == 'update_location':
            # Update geolocation from map
            lat = request.POST.get('center_latitude')
            lng = request.POST.get('center_longitude')
            radius_km = request.POST.get('radius_km')

            if lat and lng:
                zone.center_latitude = lat
                zone.center_longitude = lng
            if radius_km:
                zone.radius_km = radius_km
            zone.save()
            messages.success(request, 'Zone location updated successfully.')

        elif action == 'add_range':
            range_name = request.POST.get('range_name')
            min_km = request.POST.get('min_km')
            max_km = request.POST.get('max_km')

            if all([range_name, min_km, max_km]):
                try:
                    distance_range = ZoneDistanceRange(
                        zone=zone,
                        name=range_name,
                        min_km=min_km,
                        max_km=max_km,
                        is_active=True
                    )
                    distance_range.full_clean()
                    distance_range.save()
                    messages.success(request, f'Distance range "{range_name}" added successfully.')
                except Exception as e:
                    messages.error(request, str(e))
            else:
                messages.error(request, 'All fields are required for distance range.')

        elif action == 'update_range':
            range_id = request.POST.get('range_id')
            distance_range = get_object_or_404(ZoneDistanceRange, pk=range_id, zone=zone)
            distance_range.name = request.POST.get('range_name', distance_range.name)
            distance_range.min_km = request.POST.get('min_km', distance_range.min_km)
            distance_range.max_km = request.POST.get('max_km', distance_range.max_km)
            distance_range.is_active = request.POST.get('is_active') == 'on'
            try:
                distance_range.full_clean()
                distance_range.save()
                messages.success(request, 'Distance range updated successfully.')
            except Exception as e:
                messages.error(request, str(e))

        elif action == 'delete_range':
            range_id = request.POST.get('range_id')
            distance_range = get_object_or_404(ZoneDistanceRange, pk=range_id, zone=zone)
            distance_range.delete()
            messages.success(request, 'Distance range deleted successfully.')

        elif action == 'delete_zone':
            zone_name = zone.name
            zone.delete()
            messages.success(request, f'Zone "{zone_name}" deleted successfully.')
            return redirect('dashboard:zone_list')

        return redirect('dashboard:zone_detail', pk=pk)

    distance_ranges = zone.distance_ranges.all().order_by('min_km')
    site_settings = SiteSettings.get_settings()

    context = {
        'zone': zone,
        'distance_ranges': distance_ranges,
        'google_maps_api_key': site_settings.google_maps_api_key,
    }
    return render(request, 'dashboard/zones/detail.html', context)


# Route Views
@login_required
@user_passes_test(is_admin)
def route_list(request):
    """List all routes."""
    routes = Route.objects.annotate(
        vehicle_count=Count('vehicle_pricing')
    ).order_by('order', 'name')

    context = {
        'routes': routes,
    }
    return render(request, 'dashboard/routes/list.html', context)


@login_required
@user_passes_test(is_admin)
def route_create(request):
    """Create a new route."""
    from django.utils.text import slugify

    if request.method == 'POST':
        name = request.POST.get('name')
        origin_name = request.POST.get('origin_name')
        destination_name = request.POST.get('destination_name')
        distance_km = request.POST.get('distance_km') or 0

        if all([name, origin_name, destination_name]):
            slug = slugify(name)
            # Ensure unique slug
            base_slug = slug
            counter = 1
            while Route.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            import json as json_mod
            custom_info = {}
            custom_info_raw = request.POST.get('custom_info', '{}')
            try:
                custom_info = json_mod.loads(custom_info_raw) if custom_info_raw else {}
            except (json_mod.JSONDecodeError, ValueError):
                pass

            route = Route.objects.create(
                name=name,
                slug=slug,
                description=request.POST.get('description', ''),
                origin_name=origin_name,
                origin_latitude=request.POST.get('origin_latitude') or None,
                origin_longitude=request.POST.get('origin_longitude') or None,
                origin_radius_km=request.POST.get('origin_radius_km') or 10,
                destination_name=destination_name,
                destination_latitude=request.POST.get('destination_latitude') or None,
                destination_longitude=request.POST.get('destination_longitude') or None,
                destination_radius_km=request.POST.get('destination_radius_km') or 10,
                distance_km=distance_km,
                estimated_duration_minutes=request.POST.get('estimated_duration_minutes') or None,
                deposit_percentage=request.POST.get('deposit_percentage', 0) or 0,
                custom_info=custom_info,
                is_bidirectional=True,
                is_popular=False,
                is_active=request.POST.get('is_active') == 'on'
            )
            messages.success(request, f'Route "{name}" created successfully.')
            return redirect('dashboard:route_detail', pk=route.pk)
        else:
            messages.error(request, 'Name, origin, and destination are required.')

    return render(request, 'dashboard/routes/create.html')


@login_required
@user_passes_test(is_admin)
def route_detail(request, pk):
    """Route detail view with zones and vehicle pricing."""
    route = get_object_or_404(
        Route.objects.prefetch_related(
            'vehicle_pricing__vehicle__category',
            'vehicle_pricing__pickup_zone',
            'vehicle_pricing__dropoff_zone',
            'pickup_zones',
            'dropoff_zones'
        ),
        pk=pk
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_route':
            import json as json_mod
            route.name = request.POST.get('name', route.name)
            route.description = request.POST.get('description', '')
            route.origin_name = request.POST.get('origin_name', route.origin_name)
            route.origin_latitude = request.POST.get('origin_latitude') or None
            route.origin_longitude = request.POST.get('origin_longitude') or None
            route.origin_radius_km = request.POST.get('origin_radius_km') or 10
            route.destination_name = request.POST.get('destination_name', route.destination_name)
            route.destination_latitude = request.POST.get('destination_latitude') or None
            route.destination_longitude = request.POST.get('destination_longitude') or None
            route.destination_radius_km = request.POST.get('destination_radius_km') or 10
            route.distance_km = request.POST.get('distance_km', route.distance_km)
            route.estimated_duration_minutes = request.POST.get('estimated_duration_minutes') or None
            route.deposit_percentage = request.POST.get('deposit_percentage', 0) or 0
            custom_info_raw = request.POST.get('custom_info', '{}')
            try:
                route.custom_info = json_mod.loads(custom_info_raw) if custom_info_raw else {}
            except (json_mod.JSONDecodeError, ValueError):
                pass
            route.is_bidirectional = request.POST.get('is_bidirectional') == 'on'
            route.is_popular = request.POST.get('is_popular') == 'on'
            route.is_active = request.POST.get('is_active') == 'on'
            route.order = request.POST.get('order', 0)
            route.save()
            messages.success(request, 'Route updated successfully.')

        # Pickup Zone actions
        elif action == 'add_pickup_zone':
            name = request.POST.get('zone_name')
            lat = request.POST.get('latitude')
            lng = request.POST.get('longitude')
            radius = request.POST.get('radius_km') or 5

            if all([name, lat, lng]):
                RoutePickupZone.objects.create(
                    route=route,
                    name=name,
                    center_latitude=lat,
                    center_longitude=lng,
                    radius_km=radius,
                    color=request.POST.get('color', '#28a745')
                )
                messages.success(request, f'Pickup zone "{name}" added successfully.')
            else:
                messages.error(request, 'Name and coordinates are required.')

        elif action == 'update_pickup_zone':
            zone_id = request.POST.get('zone_id')
            zone = get_object_or_404(RoutePickupZone, pk=zone_id, route=route)
            zone.name = request.POST.get('zone_name', zone.name)
            zone.center_latitude = request.POST.get('latitude') or zone.center_latitude
            zone.center_longitude = request.POST.get('longitude') or zone.center_longitude
            zone.radius_km = request.POST.get('radius_km') or zone.radius_km
            zone.color = request.POST.get('color') or zone.color
            zone.is_active = request.POST.get('is_active') == 'on'
            zone.save()
            messages.success(request, 'Pickup zone updated successfully.')

        elif action == 'delete_pickup_zone':
            zone_id = request.POST.get('zone_id')
            zone = get_object_or_404(RoutePickupZone, pk=zone_id, route=route)
            zone_name = zone.name
            zone.delete()
            messages.success(request, f'Pickup zone "{zone_name}" deleted successfully.')

        # Dropoff Zone actions
        elif action == 'add_dropoff_zone':
            name = request.POST.get('zone_name')
            lat = request.POST.get('latitude')
            lng = request.POST.get('longitude')
            radius = request.POST.get('radius_km') or 5

            if all([name, lat, lng]):
                RouteDropoffZone.objects.create(
                    route=route,
                    name=name,
                    center_latitude=lat,
                    center_longitude=lng,
                    radius_km=radius,
                    color=request.POST.get('color', '#dc3545')
                )
                messages.success(request, f'Dropoff zone "{name}" added successfully.')
            else:
                messages.error(request, 'Name and coordinates are required.')

        elif action == 'update_dropoff_zone':
            zone_id = request.POST.get('zone_id')
            zone = get_object_or_404(RouteDropoffZone, pk=zone_id, route=route)
            zone.name = request.POST.get('zone_name', zone.name)
            zone.center_latitude = request.POST.get('latitude') or zone.center_latitude
            zone.center_longitude = request.POST.get('longitude') or zone.center_longitude
            zone.radius_km = request.POST.get('radius_km') or zone.radius_km
            zone.color = request.POST.get('color') or zone.color
            zone.is_active = request.POST.get('is_active') == 'on'
            zone.save()
            messages.success(request, 'Dropoff zone updated successfully.')

        elif action == 'delete_dropoff_zone':
            zone_id = request.POST.get('zone_id')
            zone = get_object_or_404(RouteDropoffZone, pk=zone_id, route=route)
            zone_name = zone.name
            zone.delete()
            messages.success(request, f'Dropoff zone "{zone_name}" deleted successfully.')

        # Vehicle Pricing actions (updated for zones)
        elif action == 'add_vehicle_pricing':
            vehicle_id = request.POST.get('vehicle')
            price = request.POST.get('price')
            pickup_zone_id = request.POST.get('pickup_zone') or None
            dropoff_zone_id = request.POST.get('dropoff_zone') or None

            if vehicle_id and price:
                try:
                    VehicleRoutePricing.objects.create(
                        vehicle_id=vehicle_id,
                        route=route,
                        pickup_zone_id=pickup_zone_id,
                        dropoff_zone_id=dropoff_zone_id,
                        price=price,
                        is_active=True
                    )
                    messages.success(request, 'Vehicle pricing added successfully.')
                except Exception as e:
                    messages.error(request, f'Error adding pricing: {e}')
            else:
                messages.error(request, 'Please select a vehicle and enter a price.')

        elif action == 'update_vehicle_pricing':
            pricing_id = request.POST.get('pricing_id')
            pricing = get_object_or_404(VehicleRoutePricing, pk=pricing_id, route=route)
            pricing.price = request.POST.get('price', pricing.price)
            pricing.save()
            messages.success(request, 'Vehicle pricing updated successfully.')

        elif action == 'delete_vehicle_pricing':
            pricing_id = request.POST.get('pricing_id')
            pricing = get_object_or_404(VehicleRoutePricing, pk=pricing_id, route=route)
            pricing.delete()
            messages.success(request, 'Vehicle pricing deleted successfully.')

        elif action == 'delete_route':
            route_name = route.name
            route.delete()
            messages.success(request, f'Route "{route_name}" deleted successfully.')
            return redirect('dashboard:route_list')

        return redirect('dashboard:route_detail', pk=pk)

    # Get all vehicles for pricing dropdown
    available_vehicles = Vehicle.objects.filter(
        service_type='transfer',
        is_active=True
    ).select_related('category')

    # Get zones
    pickup_zones = route.pickup_zones.filter(is_active=True).order_by('order', 'name')
    dropoff_zones = route.dropoff_zones.filter(is_active=True).order_by('order', 'name')

    context = {
        'route': route,
        'pickup_zones': pickup_zones,
        'dropoff_zones': dropoff_zones,
        'vehicle_pricing': route.vehicle_pricing.select_related(
            'vehicle__category', 'pickup_zone', 'dropoff_zone'
        ).order_by('vehicle__name', 'pickup_zone__order', 'dropoff_zone__order'),
        'available_vehicles': available_vehicles,
    }
    return render(request, 'dashboard/routes/detail.html', context)


# User Views
@login_required
@user_passes_test(is_admin)
def user_list(request):
    """List all users."""
    users = User.objects.all().order_by('-created_at')

    # Filters
    role = request.GET.get('role')
    search = request.GET.get('search')

    if role:
        users = users.filter(role=role)
    if search:
        users = users.filter(
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )

    paginator = Paginator(users, 20)
    page = request.GET.get('page')
    users = paginator.get_page(page)

    context = {
        'users': users,
        'roles': User.Role.choices,
    }
    return render(request, 'dashboard/users/list.html', context)


# Payment Views
@login_required
@user_passes_test(is_admin)
def payment_list(request):
    """List all payments."""
    payments = Payment.objects.select_related('gateway', 'customer').order_by('-created_at')

    # Filters
    status = request.GET.get('status')
    payment_type = request.GET.get('type')

    if status:
        payments = payments.filter(status=status)
    if payment_type:
        payments = payments.filter(payment_type=payment_type)

    paginator = Paginator(payments, 20)
    page = request.GET.get('page')
    payments = paginator.get_page(page)

    context = {
        'payments': payments,
        'statuses': Payment.Status.choices,
        'types': Payment.PaymentType.choices,
    }
    return render(request, 'dashboard/payments/list.html', context)


# Reports
@login_required
@user_passes_test(is_admin)
def reports(request):
    """Reports dashboard."""
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Monthly revenue
    monthly_revenue = Payment.objects.filter(
        status='completed',
        completed_at__date__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Revenue by type
    revenue_by_type = Payment.objects.filter(
        status='completed',
        completed_at__date__gte=month_start
    ).values('payment_type').annotate(
        total=Sum('amount'),
        count=Count('id')
    )

    # Top routes (using address fields now)
    top_routes = Transfer.objects.filter(
        created_at__date__gte=month_start
    ).values(
        'pickup_address', 'dropoff_address'
    ).annotate(count=Count('id')).order_by('-count')[:10]

    # Top trips
    top_trips = TripBooking.objects.filter(
        created_at__date__gte=month_start
    ).values('trip__name').annotate(count=Count('id')).order_by('-count')[:10]

    context = {
        'monthly_revenue': monthly_revenue,
        'revenue_by_type': revenue_by_type,
        'top_routes': top_routes,
        'top_trips': top_trips,
    }
    return render(request, 'dashboard/reports/index.html', context)


# Settings
@login_required
@user_passes_test(is_admin)
def settings_view(request):
    """Settings page."""
    from apps.payments.models import PaymentGateway

    site_settings = SiteSettings.get_settings()

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_api_keys':
            site_settings.google_maps_api_key = request.POST.get('google_maps_api_key', '')
            site_settings.save()
            messages.success(request, 'API keys updated successfully.')

        elif action == 'update_stripe':
            site_settings.stripe_publishable_key = request.POST.get('stripe_publishable_key', '')
            site_settings.stripe_secret_key = request.POST.get('stripe_secret_key', '')
            site_settings.stripe_webhook_secret = request.POST.get('stripe_webhook_secret', '')
            site_settings.save()
            messages.success(request, 'Stripe settings updated successfully.')

        elif action == 'update_paypal':
            site_settings.paypal_client_id = request.POST.get('paypal_client_id', '')
            site_settings.paypal_client_secret = request.POST.get('paypal_client_secret', '')
            site_settings.paypal_mode = request.POST.get('paypal_mode', 'sandbox')
            site_settings.save()
            messages.success(request, 'PayPal settings updated successfully.')

        elif action == 'update_general':
            site_settings.site_name = request.POST.get('site_name', site_settings.site_name)
            site_settings.contact_email = request.POST.get('contact_email', '')
            site_settings.contact_phone = request.POST.get('contact_phone', '')
            site_settings.default_currency = request.POST.get('default_currency', 'MAD')
            site_settings.cost_currency = request.POST.get('cost_currency', 'MAD')
            site_settings.save()
            messages.success(request, 'General settings updated successfully.')

        return redirect('dashboard:settings')

    gateways = PaymentGateway.objects.all()
    zones = Zone.objects.all()

    context = {
        'gateways': gateways,
        'zones': zones,
        'site_settings': site_settings,
    }
    return render(request, 'dashboard/settings/index.html', context)


# Trip/Tour Views
@login_required
@user_passes_test(is_admin)
def trip_create(request):
    """Create a new trip/tour."""
    from django.utils.text import slugify
    import json

    if request.method == 'POST':
        try:
            # Basic Info
            name = request.POST.get('name')
            slug = request.POST.get('slug') or slugify(name)

            # Ensure unique slug
            base_slug = slug
            counter = 1
            while Trip.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            trip = Trip.objects.create(
                name=name,
                slug=slug,
                short_description=request.POST.get('short_description', ''),
                description=request.POST.get('description', ''),
                trip_type=request.POST.get('trip_type', 'day_trip'),
                service_type=request.POST.get('service_type', 'tour'),
                departure_location=request.POST.get('departure_location', ''),
                destinations=request.POST.get('destinations', ''),
                driver_languages=request.POST.get('driver_languages', ''),
                duration_hours=request.POST.get('duration_hours') or None,
                duration_days=request.POST.get('duration_days') or 1,
                min_participants=request.POST.get('min_participants') or 1,
                max_participants=request.POST.get('max_participants') or 20,
                pricing_model=request.POST.get('pricing_model', 'per_person'),
                price_per_person=request.POST.get('price_per_person') or None,
                child_price=request.POST.get('child_price') or None,
                private_tour_price=request.POST.get('private_tour_price') or None,
                currency=request.POST.get('currency', 'MAD'),
                inclusions=request.POST.get('inclusions', ''),
                exclusions=request.POST.get('exclusions', ''),
                cancellation_policy=request.POST.get('cancellation_policy', 'flexible'),
                booking_notice_hours=request.POST.get('booking_notice_hours') or 24,
                instant_confirmation=request.POST.get('instant_confirmation') == 'on',
                child_policy=request.POST.get('child_policy', ''),
                accessibility_info=request.POST.get('accessibility_info', ''),
                meta_title=request.POST.get('meta_title', ''),
                meta_description=request.POST.get('meta_description', ''),
                meta_keywords=request.POST.get('meta_keywords', ''),
                status=request.POST.get('status', 'draft'),
                is_active=request.POST.get('status') == 'published',
            )

            # Handle featured image
            if request.FILES.get('featured_image'):
                trip.featured_image = request.FILES['featured_image']
                trip.save()

            # Handle gallery images
            images = request.FILES.getlist('gallery_images')
            for idx, img in enumerate(images):
                alt_text = request.POST.get(f'image_alt_{idx}', '')
                is_thumb = request.POST.get(f'image_thumbnail_{idx}') == 'on'
                TripImage.objects.create(
                    trip=trip,
                    image=img,
                    alt_text=alt_text,
                    is_thumbnail=is_thumb,
                    order=idx
                )

            # Handle highlights
            highlight_texts = request.POST.getlist('highlight_text[]')
            highlight_icons = request.POST.getlist('highlight_icon[]')
            for idx, text in enumerate(highlight_texts):
                if text.strip():
                    icon = highlight_icons[idx] if idx < len(highlight_icons) else 'bi-check-circle'
                    TripHighlight.objects.create(
                        trip=trip,
                        text=text,
                        icon=icon,
                        order=idx
                    )

            # Handle itinerary stops
            stop_names = request.POST.getlist('stop_name[]')
            stop_types = request.POST.getlist('stop_type[]')
            stop_locations = request.POST.getlist('stop_location[]')
            stop_descriptions = request.POST.getlist('stop_description[]')
            stop_durations = request.POST.getlist('stop_duration[]')

            for idx, name in enumerate(stop_names):
                if name.strip():
                    TripItineraryStop.objects.create(
                        trip=trip,
                        name=name,
                        stop_type=stop_types[idx] if idx < len(stop_types) else 'stop',
                        location=stop_locations[idx] if idx < len(stop_locations) else '',
                        description=stop_descriptions[idx] if idx < len(stop_descriptions) else '',
                        duration_minutes=int(stop_durations[idx]) if idx < len(stop_durations) and stop_durations[idx] else None,
                        has_admission=request.POST.get(f'stop_admission_{idx}') == 'on',
                        pickup_flexibility=request.POST.get(f'stop_flexibility_{idx}') == 'on',
                        same_as_start=request.POST.get(f'stop_same_as_start_{idx}') == 'on',
                        order=idx
                    )

            # Handle price tiers
            tier_names = request.POST.getlist('tier_name[]')
            tier_min = request.POST.getlist('tier_min[]')
            tier_max = request.POST.getlist('tier_max[]')
            tier_prices = request.POST.getlist('tier_price[]')

            for idx, tier_name in enumerate(tier_names):
                if tier_name.strip() and idx < len(tier_prices) and tier_prices[idx]:
                    TripPriceTier.objects.create(
                        trip=trip,
                        name=tier_name,
                        min_travelers=int(tier_min[idx]) if idx < len(tier_min) and tier_min[idx] else 1,
                        max_travelers=int(tier_max[idx]) if idx < len(tier_max) and tier_max[idx] else 2,
                        price_per_person=Decimal(tier_prices[idx]),
                        order=idx
                    )

            # Handle content blocks (What to Expect)
            block_titles = request.POST.getlist('block_title[]')
            block_contents = request.POST.getlist('block_content[]')

            for idx, title in enumerate(block_titles):
                if title.strip() and idx < len(block_contents) and block_contents[idx].strip():
                    TripContentBlock.objects.create(
                        trip=trip,
                        title=title,
                        content=block_contents[idx],
                        order=idx
                    )

            # Handle FAQs
            faq_questions = request.POST.getlist('faq_question[]')
            faq_answers = request.POST.getlist('faq_answer[]')

            for idx, question in enumerate(faq_questions):
                if question.strip() and idx < len(faq_answers) and faq_answers[idx].strip():
                    TripFAQ.objects.create(
                        trip=trip,
                        question=question,
                        answer=faq_answers[idx],
                        order=idx
                    )

            # Handle related trips
            related_ids = request.POST.getlist('related_trips')
            if related_ids:
                trip.related_trips.set(related_ids)

            messages.success(request, f'Tour "{trip.name}" created successfully.')
            return redirect('dashboard:trip_detail', pk=trip.pk)

        except Exception as e:
            messages.error(request, f'Error creating tour: {e}')

    # Context for the form
    all_trips = Trip.objects.filter(is_active=True).exclude(status='archived').order_by('name')

    # Default inclusions/exclusions suggestions
    default_inclusions = [
        'Private car transfer',
        'Air-conditioned vehicle',
        'English-speaking driver',
        'Hotel pickup and drop-off',
        'Bottled water',
        'All taxes and fees',
    ]
    default_exclusions = [
        'Gratuities (optional)',
        'Food and drinks',
        'Personal expenses',
        'Travel insurance',
        'Entry fees (unless specified)',
    ]

    context = {
        'trip_types': Trip.TripType.choices,
        'service_types': Trip.ServiceType.choices,
        'pricing_models': Trip.PricingModel.choices,
        'cancellation_policies': Trip.CancellationPolicy.choices,
        'statuses': Trip.Status.choices,
        'all_trips': all_trips,
        'default_inclusions': default_inclusions,
        'default_exclusions': default_exclusions,
        'languages': [
            ('en', 'English'),
            ('fr', 'French'),
            ('ar', 'Arabic'),
            ('es', 'Spanish'),
            ('de', 'German'),
            ('it', 'Italian'),
            ('pt', 'Portuguese'),
            ('nl', 'Dutch'),
            ('ru', 'Russian'),
            ('zh', 'Chinese'),
            ('ja', 'Japanese'),
        ],
    }
    return render(request, 'dashboard/trips/create.html', context)


@login_required
@user_passes_test(is_admin)
def trip_detail(request, pk):
    """Trip/tour detail and edit view."""
    trip = get_object_or_404(
        Trip.objects.prefetch_related(
            'images', 'highlights', 'itinerary_stops', 'price_tiers',
            'content_blocks', 'faqs', 'related_trips'
        ),
        pk=pk
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_trip':
            # Update basic fields
            trip.name = request.POST.get('name', trip.name)
            trip.short_description = request.POST.get('short_description', '')
            trip.description = request.POST.get('description', '')
            trip.trip_type = request.POST.get('trip_type', trip.trip_type)
            trip.service_type = request.POST.get('service_type', trip.service_type)
            trip.departure_location = request.POST.get('departure_location', '')
            trip.destinations = request.POST.get('destinations', '')
            trip.driver_languages = request.POST.get('driver_languages', '')
            trip.duration_hours = request.POST.get('duration_hours') or None
            trip.duration_days = request.POST.get('duration_days') or 1
            trip.min_participants = request.POST.get('min_participants') or 1
            trip.max_participants = request.POST.get('max_participants') or 20
            trip.pricing_model = request.POST.get('pricing_model', trip.pricing_model)
            trip.price_per_person = request.POST.get('price_per_person') or None
            trip.child_price = request.POST.get('child_price') or None
            trip.private_tour_price = request.POST.get('private_tour_price') or None
            trip.currency = request.POST.get('currency', 'MAD')
            trip.inclusions = request.POST.get('inclusions', '')
            trip.exclusions = request.POST.get('exclusions', '')
            trip.cancellation_policy = request.POST.get('cancellation_policy', trip.cancellation_policy)
            trip.booking_notice_hours = request.POST.get('booking_notice_hours') or 24
            trip.instant_confirmation = request.POST.get('instant_confirmation') == 'on'
            trip.child_policy = request.POST.get('child_policy', '')
            trip.accessibility_info = request.POST.get('accessibility_info', '')
            trip.meta_title = request.POST.get('meta_title', '')
            trip.meta_description = request.POST.get('meta_description', '')
            trip.meta_keywords = request.POST.get('meta_keywords', '')
            trip.status = request.POST.get('status', trip.status)
            trip.is_active = trip.status == 'published'

            if request.FILES.get('featured_image'):
                trip.featured_image = request.FILES['featured_image']

            trip.save()
            messages.success(request, 'Tour updated successfully.')

        elif action == 'delete_trip':
            trip_name = trip.name
            trip.delete()
            messages.success(request, f'Tour "{trip_name}" deleted.')
            return redirect('dashboard:trip_list')

        return redirect('dashboard:trip_detail', pk=pk)

    all_trips = Trip.objects.filter(is_active=True).exclude(pk=pk).order_by('name')

    context = {
        'trip': trip,
        'trip_types': Trip.TripType.choices,
        'service_types': Trip.ServiceType.choices,
        'pricing_models': Trip.PricingModel.choices,
        'cancellation_policies': Trip.CancellationPolicy.choices,
        'statuses': Trip.Status.choices,
        'all_trips': all_trips,
    }
    return render(request, 'dashboard/trips/detail.html', context)


@login_required
@user_passes_test(is_admin)
def trip_preview(request, pk):
    """Standalone customer-facing preview of a trip/tour."""
    trip = get_object_or_404(
        Trip.objects.prefetch_related(
            'images', 'highlights', 'itinerary_stops', 'price_tiers',
            'content_blocks', 'faqs', 'schedules', 'related_trips',
        ),
        pk=pk
    )
    related = trip.related_trips.filter(is_active=True)[:4]
    if not related.exists():
        related = Trip.objects.filter(
            is_active=True, status='published'
        ).exclude(pk=pk)[:4]
    return render(request, 'dashboard/trips/preview.html', {
        'trip': trip,
        'related_trips': related,
    })


# API Key Views
@login_required
@user_passes_test(is_admin)
def api_key_list(request):
    """List and create API keys."""
    new_key = None

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'create_key':
            name = request.POST.get('name', '').strip()
            tier = request.POST.get('tier', 'standard')

            if name:
                raw_key, hashed_key, prefix = APIKey.generate_key()
                rate_limits = {'free': 30, 'standard': 100, 'premium': 500}
                APIKey.objects.create(
                    name=name,
                    key=hashed_key,
                    prefix=prefix,
                    owner=request.user,
                    tier=tier,
                    rate_limit=rate_limits.get(tier, 100),
                )
                new_key = raw_key
                messages.success(request, f'API key "{name}" created successfully.')
            else:
                messages.error(request, 'Key name is required.')

    api_keys = APIKey.objects.filter(owner=request.user).order_by('-created_at')
    if request.user.is_superuser:
        api_keys = APIKey.objects.all().order_by('-created_at')

    context = {
        'api_keys': api_keys,
        'new_key': new_key,
    }
    return render(request, 'dashboard/api_keys/list.html', context)


@login_required
@user_passes_test(is_admin)
def api_key_detail(request, pk):
    """Edit/revoke/delete an API key."""
    api_key = get_object_or_404(APIKey, pk=pk)

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_key':
            api_key.name = request.POST.get('name', api_key.name)
            api_key.tier = request.POST.get('tier', api_key.tier)
            api_key.rate_limit = int(request.POST.get('rate_limit', api_key.rate_limit))
            api_key.is_active = request.POST.get('is_active') == 'on'

            origins_raw = request.POST.get('allowed_origins', '')
            api_key.allowed_origins = [o.strip() for o in origins_raw.split(',') if o.strip()] if origins_raw.strip() else []

            api_key.save()
            messages.success(request, 'API key updated successfully.')

        elif action == 'revoke':
            api_key.is_active = False
            api_key.save()
            messages.success(request, 'API key revoked.')

        elif action == 'delete_key':
            api_key.delete()
            messages.success(request, 'API key deleted.')
            return redirect('dashboard:api_key_list')

        return redirect('dashboard:api_key_detail', pk=pk)

    context = {
        'api_key': api_key,
    }
    return render(request, 'dashboard/api_keys/detail.html', context)


# Coupon Views
@login_required
@user_passes_test(is_admin)
def coupon_list(request):
    """List all coupons."""
    coupons = Coupon.objects.all().order_by('-created_at')
    context = {'coupons': coupons}
    return render(request, 'dashboard/coupons/list.html', context)


@login_required
@user_passes_test(is_admin)
def coupon_create(request):
    """Create a new coupon."""
    if request.method == 'POST':
        code = request.POST.get('code', '').strip().upper()
        if code:
            from django.utils.dateparse import parse_datetime
            coupon = Coupon.objects.create(
                code=code,
                description=request.POST.get('description', ''),
                discount_type=request.POST.get('discount_type', 'percentage'),
                discount_value=request.POST.get('discount_value', 0),
                currency=request.POST.get('currency', 'MAD'),
                min_order_amount=request.POST.get('min_order_amount') or 0,
                max_discount_amount=request.POST.get('max_discount_amount') or None,
                usage_limit=request.POST.get('usage_limit') or None,
                usage_per_customer=request.POST.get('usage_per_customer') or None,
                valid_from=parse_datetime(request.POST.get('valid_from', '')) if request.POST.get('valid_from') else None,
                valid_until=parse_datetime(request.POST.get('valid_until', '')) if request.POST.get('valid_until') else None,
                applicable_to=request.POST.get('applicable_to', 'all'),
                is_active=True,
            )
            messages.success(request, f'Coupon "{code}" created successfully.')
            return redirect('dashboard:coupon_detail', pk=coupon.pk)
        else:
            messages.error(request, 'Coupon code is required.')

    return render(request, 'dashboard/coupons/create.html')


@login_required
@user_passes_test(is_admin)
def coupon_detail(request, pk):
    """Edit/delete a coupon."""
    coupon = get_object_or_404(Coupon, pk=pk)

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_coupon':
            from django.utils.dateparse import parse_datetime
            coupon.code = request.POST.get('code', coupon.code).strip().upper()
            coupon.description = request.POST.get('description', '')
            coupon.discount_type = request.POST.get('discount_type', coupon.discount_type)
            coupon.discount_value = request.POST.get('discount_value', coupon.discount_value)
            coupon.currency = request.POST.get('currency', coupon.currency)
            coupon.min_order_amount = request.POST.get('min_order_amount') or 0
            coupon.max_discount_amount = request.POST.get('max_discount_amount') or None
            coupon.usage_limit = request.POST.get('usage_limit') or None
            coupon.usage_per_customer = request.POST.get('usage_per_customer') or None
            coupon.valid_from = parse_datetime(request.POST.get('valid_from', '')) if request.POST.get('valid_from') else None
            coupon.valid_until = parse_datetime(request.POST.get('valid_until', '')) if request.POST.get('valid_until') else None
            coupon.applicable_to = request.POST.get('applicable_to', coupon.applicable_to)
            coupon.is_active = request.POST.get('is_active') == 'on'
            coupon.save()
            messages.success(request, 'Coupon updated successfully.')

        elif action == 'delete_coupon':
            coupon.delete()
            messages.success(request, 'Coupon deleted.')
            return redirect('dashboard:coupon_list')

        return redirect('dashboard:coupon_detail', pk=pk)

    context = {'coupon': coupon}
    return render(request, 'dashboard/coupons/detail.html', context)
