"""
Management command to populate the database with realistic test data.

Usage:
    python manage.py create_test_data
    python manage.py create_test_data --flush  # Delete all data first
"""

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User, SiteSettings
from apps.accounts.api_keys import APIKey
from apps.vehicles.models import VehicleCategory, VehicleFeature, Vehicle
from apps.locations.models import (
    Zone, ZoneDistanceRange, Route, RoutePickupZone,
    RouteDropoffZone, VehicleRoutePricing,
)
from apps.transfers.models import TransferExtra
from apps.payments.models import PaymentGateway, Coupon
from apps.trips.models import (
    Trip, TripHighlight, TripItineraryStop, TripPriceTier,
    TripContentBlock, TripFAQ, TripSchedule,
)


class Command(BaseCommand):
    help = 'Create test data for the Transfers.ma platform'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush', action='store_true',
            help='Delete existing test data before creating new data',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Flushing existing data...')
            self._flush()

        self.stdout.write('Creating test data...')

        admin = self._create_superuser()
        self._create_site_settings()
        api_key = self._create_api_key(admin)
        features = self._create_vehicle_features()
        categories = self._create_vehicle_categories()
        vehicles = self._create_vehicles(categories, features)
        routes = self._create_routes()
        self._create_route_pricing(vehicles, routes)
        self._create_transfer_extras()
        self._create_payment_gateways()
        self._create_coupons()
        self._create_trips()

        self.stdout.write(self.style.SUCCESS('Test data created successfully!'))
        self.stdout.write(f'  Admin: admin@transfers.ma / testpass123')
        self.stdout.write(f'  API Key: {api_key}')

    def _flush(self):
        TripSchedule.objects.all().delete()
        TripFAQ.objects.all().delete()
        TripContentBlock.objects.all().delete()
        TripPriceTier.objects.all().delete()
        TripItineraryStop.objects.all().delete()
        TripHighlight.objects.all().delete()
        Trip.objects.all().delete()
        Coupon.objects.all().delete()
        PaymentGateway.objects.all().delete()
        TransferExtra.objects.all().delete()
        VehicleRoutePricing.objects.all().delete()
        RoutePickupZone.objects.all().delete()
        RouteDropoffZone.objects.all().delete()
        Route.objects.all().delete()
        ZoneDistanceRange.objects.all().delete()
        Zone.objects.all().delete()
        Vehicle.objects.all().delete()
        VehicleCategory.objects.all().delete()
        VehicleFeature.objects.all().delete()
        APIKey.objects.all().delete()
        SiteSettings.objects.all().delete()
        User.objects.filter(email='admin@transfers.ma').delete()

    # ── Superuser ──────────────────────────────────────────────

    def _create_superuser(self):
        user, created = User.objects.get_or_create(
            email='admin@transfers.ma',
            defaults={
                'first_name': 'Admin',
                'last_name': 'Transfers',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
                'role': User.Role.ADMIN,
            },
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write('  Created superuser: admin@transfers.ma')
        else:
            self.stdout.write('  Superuser already exists')
        return user

    # ── Site Settings ──────────────────────────────────────────

    def _create_site_settings(self):
        settings, _ = SiteSettings.objects.update_or_create(
            pk=1,
            defaults={
                'site_name': 'Transfers.ma',
                'contact_email': 'contact@transfers.ma',
                'contact_phone': '+212 600 000 000',
                'default_currency': 'MAD',
                'stripe_publishable_key': 'pk_test_51ABC123DEFghiJKLmnoPQRSTuvwXYZ',
                'stripe_secret_key': 'sk_test_51ABC123DEFghiJKLmnoPQRSTuvwXYZ',
                'stripe_webhook_secret': 'whsec_test_ABC123DEFghiJKLmnoPQRSTuvwXYZ',
                'paypal_client_id': 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz',
                'paypal_client_secret': 'EPPaaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPp',
                'paypal_mode': 'sandbox',
                'google_maps_api_key': '',
            },
        )
        self.stdout.write('  Created site settings')

    # ── API Key ────────────────────────────────────────────────

    def _create_api_key(self, owner):
        if APIKey.objects.filter(name='WordPress Plugin').exists():
            self.stdout.write('  API key already exists')
            return '(existing key - check dashboard)'

        raw_key, hashed_key, prefix = APIKey.generate_key()
        APIKey.objects.create(
            name='WordPress Plugin',
            key=hashed_key,
            prefix=prefix,
            owner=owner,
            tier=APIKey.Tier.PREMIUM,
            rate_limit=200,
        )
        self.stdout.write(f'  Created API key: {prefix}...')
        return raw_key

    # ── Vehicle Features ───────────────────────────────────────

    def _create_vehicle_features(self):
        feature_data = [
            ('Air Conditioning', 'bi-snow'),
            ('WiFi', 'bi-wifi'),
            ('Leather Seats', 'bi-star'),
            ('USB Charging', 'bi-plug'),
            ('Water Bottles', 'bi-cup-straw'),
            ('Baby Seat Available', 'bi-person'),
            ('Meet & Greet', 'bi-hand-wave'),
            ('Flight Monitoring', 'bi-airplane'),
        ]
        features = {}
        for name, icon in feature_data:
            feat, _ = VehicleFeature.objects.get_or_create(
                name=name, defaults={'icon': icon}
            )
            features[name] = feat
        self.stdout.write(f'  Created {len(features)} vehicle features')
        return features

    # ── Vehicle Categories ─────────────────────────────────────

    def _create_vehicle_categories(self):
        cat_data = [
            {
                'name': 'Economy Sedan',
                'slug': 'economy-sedan',
                'description': 'Best value for solo travelers and couples. Comfortable sedans for city and airport transfers.',
                'max_passengers': 3,
                'max_luggage': 2,
                'price_multiplier': Decimal('1.00'),
                'order': 1,
                'tagline': 'Affordable & reliable',
                'included_amenities': ['Air conditioning', 'USB charging'],
                'not_included': ['WiFi', 'Water bottles'],
            },
            {
                'name': 'Comfort Sedan',
                'slug': 'comfort-sedan',
                'description': 'Premium comfort at great value. Spacious sedans with extra legroom and amenities.',
                'max_passengers': 4,
                'max_luggage': 3,
                'price_multiplier': Decimal('1.30'),
                'order': 2,
                'tagline': 'Premium comfort, great value',
                'included_amenities': ['Air conditioning', 'Leather seats', 'USB charging', 'Water bottles', 'WiFi'],
                'not_included': [],
            },
            {
                'name': 'Premium SUV',
                'slug': 'premium-suv',
                'description': 'Perfect for families and groups. Spacious SUVs with ample luggage room.',
                'max_passengers': 6,
                'max_luggage': 5,
                'price_multiplier': Decimal('1.60'),
                'order': 3,
                'tagline': 'Space for the whole family',
                'included_amenities': ['Air conditioning', 'Leather seats', 'USB charging', 'Water bottles', 'WiFi'],
                'not_included': [],
            },
            {
                'name': 'Minivan',
                'slug': 'minivan',
                'description': 'Ideal for groups and families with lots of luggage. Comfortable vans with space for everyone.',
                'max_passengers': 8,
                'max_luggage': 8,
                'price_multiplier': Decimal('1.80'),
                'order': 4,
                'tagline': 'Room for everyone & everything',
                'included_amenities': ['Air conditioning', 'USB charging', 'Water bottles', 'WiFi'],
                'not_included': ['Leather seats'],
            },
            {
                'name': 'Luxury',
                'slug': 'luxury',
                'description': 'VIP experience with premium vehicles. Mercedes S-Class or equivalent for the discerning traveler.',
                'max_passengers': 4,
                'max_luggage': 3,
                'price_multiplier': Decimal('2.50'),
                'order': 5,
                'tagline': 'The ultimate VIP experience',
                'included_amenities': ['Air conditioning', 'Leather seats', 'USB charging', 'Water bottles', 'WiFi', 'Meet & greet', 'Flight monitoring'],
                'not_included': [],
            },
        ]
        categories = {}
        for data in cat_data:
            cat, _ = VehicleCategory.objects.update_or_create(
                slug=data['slug'], defaults=data,
            )
            categories[cat.slug] = cat
        self.stdout.write(f'  Created {len(categories)} vehicle categories')
        return categories

    # ── Vehicles ───────────────────────────────────────────────

    def _create_vehicles(self, categories, features):
        vehicle_data = [
            {
                'category_slug': 'economy-sedan',
                'name': 'Dacia Logan',
                'passengers': 3, 'luggage': 2, 'year': 2023,
                'features': ['Air Conditioning', 'USB Charging'],
                'client_description': 'Reliable and comfortable sedan, perfect for budget-conscious travelers.',
                'key_features': ['Fuel efficient', 'Spacious trunk'],
                'important_note': '',
                'important_note_type': 'info',
            },
            {
                'category_slug': 'comfort-sedan',
                'name': 'Mercedes C-Class',
                'passengers': 4, 'luggage': 3, 'year': 2024,
                'features': ['Air Conditioning', 'Leather Seats', 'USB Charging', 'Water Bottles', 'WiFi'],
                'client_description': 'Premium Mercedes sedan with leather interior and all modern amenities.',
                'key_features': ['Leather interior', 'Climate control', 'Premium sound system'],
                'important_note': '',
                'important_note_type': 'info',
            },
            {
                'category_slug': 'premium-suv',
                'name': 'Toyota Land Cruiser',
                'passengers': 6, 'luggage': 5, 'year': 2024,
                'features': ['Air Conditioning', 'Leather Seats', 'USB Charging', 'Water Bottles', 'WiFi'],
                'client_description': 'Powerful SUV with plenty of room for families and groups.',
                'key_features': ['4x4 capable', 'Third row seating', 'Extra luggage space'],
                'important_note': 'Ideal for Atlas Mountain routes',
                'important_note_type': 'info',
            },
            {
                'category_slug': 'minivan',
                'name': 'Mercedes Vito',
                'passengers': 8, 'luggage': 8, 'year': 2023,
                'features': ['Air Conditioning', 'USB Charging', 'Water Bottles', 'WiFi'],
                'client_description': 'Spacious van ideal for groups of up to 8 passengers with full luggage.',
                'key_features': ['Sliding doors', '8 comfortable seats', 'Large luggage area'],
                'important_note': '',
                'important_note_type': 'info',
            },
            {
                'category_slug': 'luxury',
                'name': 'Mercedes S-Class',
                'passengers': 4, 'luggage': 3, 'year': 2025,
                'features': ['Air Conditioning', 'Leather Seats', 'USB Charging', 'Water Bottles', 'WiFi', 'Meet & Greet', 'Flight Monitoring'],
                'client_description': 'The ultimate in luxury travel. Brand new Mercedes S-Class with VIP amenities.',
                'key_features': ['Massage seats', 'Privacy glass', 'Ambient lighting', 'Premium champagne'],
                'important_note': 'Includes complimentary meet & greet and flight monitoring',
                'important_note_type': 'success',
            },
        ]
        vehicles = {}
        for data in vehicle_data:
            feat_names = data.pop('features')
            cat_slug = data.pop('category_slug')
            cat = categories[cat_slug]

            vehicle, _ = Vehicle.objects.update_or_create(
                name=data['name'],
                defaults={
                    'category': cat,
                    'passengers': data['passengers'],
                    'luggage': data['luggage'],
                    'year': data.get('year'),
                    'status': Vehicle.Status.AVAILABLE,
                    'service_type': Vehicle.ServiceType.TRANSFER,
                    'client_description': data.get('client_description', ''),
                    'key_features': data.get('key_features', []),
                    'important_note': data.get('important_note', ''),
                    'important_note_type': data.get('important_note_type', 'info'),
                },
            )
            vehicle.features.set([features[f] for f in feat_names])
            vehicles[vehicle.name] = vehicle

        self.stdout.write(f'  Created {len(vehicles)} vehicles')
        return vehicles

    # ── Routes ─────────────────────────────────────────────────

    def _create_routes(self):
        routes = {}

        # Route 1: Marrakech Airport → Marrakech Medina
        r1, _ = Route.objects.update_or_create(
            slug='marrakech-airport-to-medina',
            defaults={
                'name': 'Marrakech Airport to Medina',
                'description': 'Quick and comfortable transfer from Marrakech Menara Airport to the heart of the Medina.',
                'origin_name': 'Marrakech Airport (RAK)',
                'origin_latitude': Decimal('31.6069'),
                'origin_longitude': Decimal('-8.0363'),
                'origin_radius_km': Decimal('5'),
                'destination_name': 'Marrakech Medina',
                'destination_latitude': Decimal('31.6295'),
                'destination_longitude': Decimal('-7.9811'),
                'destination_radius_km': Decimal('5'),
                'distance_km': Decimal('8.5'),
                'estimated_duration_minutes': 25,
                'is_bidirectional': True,
                'is_popular': True,
                'deposit_percentage': Decimal('30'),
                'order': 1,
                'highlights': ['Meet & greet at arrivals', 'AC vehicle', 'Flight monitoring'],
                'travel_tips': 'Have your hotel/riad address ready. Vehicles cannot enter the Medina - your driver will drop you at the nearest gate.',
                'estimated_traffic_info': '15-30 minutes at rush hour (7-9am, 5-7pm)',
                'included_amenities': ['Air conditioning', 'Free water', 'Flight monitoring'],
                'custom_info': {},
            },
        )
        # Pickup zones for Route 1
        pz1, _ = RoutePickupZone.objects.update_or_create(
            route=r1, name='Menara Airport Terminal',
            defaults={
                'center_latitude': Decimal('31.6069'),
                'center_longitude': Decimal('-8.0363'),
                'radius_km': Decimal('2'),
                'order': 1,
            },
        )
        # Dropoff zones for Route 1
        dz1, _ = RouteDropoffZone.objects.update_or_create(
            route=r1, name='Medina',
            defaults={
                'center_latitude': Decimal('31.6295'),
                'center_longitude': Decimal('-7.9811'),
                'radius_km': Decimal('2'),
                'order': 1,
            },
        )
        dz2, _ = RouteDropoffZone.objects.update_or_create(
            route=r1, name='Gueliz',
            defaults={
                'center_latitude': Decimal('31.6340'),
                'center_longitude': Decimal('-8.0100'),
                'radius_km': Decimal('3'),
                'order': 2,
            },
        )
        routes['r1'] = {'route': r1, 'pickup_zones': [pz1], 'dropoff_zones': [dz1, dz2]}

        # Route 2: Casablanca Airport → Casablanca City
        r2, _ = Route.objects.update_or_create(
            slug='casablanca-airport-to-city',
            defaults={
                'name': 'Casablanca Airport to City Center',
                'description': 'Reliable transfer from Mohammed V International Airport to Casablanca city center.',
                'origin_name': 'Casablanca Airport (CMN)',
                'origin_latitude': Decimal('33.3675'),
                'origin_longitude': Decimal('-7.5898'),
                'origin_radius_km': Decimal('5'),
                'destination_name': 'Casablanca City Center',
                'destination_latitude': Decimal('33.5731'),
                'destination_longitude': Decimal('-7.5898'),
                'destination_radius_km': Decimal('10'),
                'distance_km': Decimal('32'),
                'estimated_duration_minutes': 45,
                'is_bidirectional': True,
                'is_popular': True,
                'deposit_percentage': Decimal('30'),
                'order': 2,
                'highlights': ['Meet & greet', 'Highway transfer', 'Flight monitoring'],
                'travel_tips': 'The airport is 30km south of the city. Highway tolls are included in the price.',
                'included_amenities': ['Air conditioning', 'Free water', 'Highway tolls included'],
                'custom_info': {},
            },
        )
        pz2, _ = RoutePickupZone.objects.update_or_create(
            route=r2, name='Mohammed V Airport',
            defaults={
                'center_latitude': Decimal('33.3675'),
                'center_longitude': Decimal('-7.5898'),
                'radius_km': Decimal('3'),
                'order': 1,
            },
        )
        dz3, _ = RouteDropoffZone.objects.update_or_create(
            route=r2, name='Casablanca Centre',
            defaults={
                'center_latitude': Decimal('33.5731'),
                'center_longitude': Decimal('-7.5898'),
                'radius_km': Decimal('5'),
                'order': 1,
            },
        )
        routes['r2'] = {'route': r2, 'pickup_zones': [pz2], 'dropoff_zones': [dz3]}

        # Route 3: Marrakech → Essaouira
        r3, _ = Route.objects.update_or_create(
            slug='marrakech-to-essaouira',
            defaults={
                'name': 'Marrakech to Essaouira',
                'description': 'Scenic transfer through the Argan countryside to the charming coastal town of Essaouira.',
                'origin_name': 'Marrakech',
                'origin_latitude': Decimal('31.6295'),
                'origin_longitude': Decimal('-7.9811'),
                'origin_radius_km': Decimal('15'),
                'destination_name': 'Essaouira',
                'destination_latitude': Decimal('31.5085'),
                'destination_longitude': Decimal('-9.7595'),
                'destination_radius_km': Decimal('10'),
                'distance_km': Decimal('185'),
                'estimated_duration_minutes': 165,
                'is_bidirectional': True,
                'is_popular': True,
                'deposit_percentage': Decimal('30'),
                'order': 3,
                'highlights': ['Scenic Argan tree route', 'Photo stop available', 'AC long-distance vehicle'],
                'travel_tips': 'The road is well-maintained. Ask your driver for an Argan oil cooperative stop.',
                'estimated_traffic_info': 'Approx 2h45 via N8 highway. Little traffic outside Marrakech.',
                'included_amenities': ['Air conditioning', 'Free water', 'Photo stops'],
                'custom_info': {},
            },
        )
        routes['r3'] = {'route': r3, 'pickup_zones': [], 'dropoff_zones': []}

        self.stdout.write(f'  Created {len(routes)} routes with zones')
        return routes

    # ── Route Pricing ──────────────────────────────────────────

    def _create_route_pricing(self, vehicles, routes):
        pricing_map = {
            'r1': {  # Airport → Medina (8.5km)
                'Dacia Logan': 150,
                'Mercedes C-Class': 200,
                'Toyota Land Cruiser': 300,
                'Mercedes Vito': 350,
                'Mercedes S-Class': 500,
            },
            'r2': {  # Casa Airport → City (32km)
                'Dacia Logan': 300,
                'Mercedes C-Class': 400,
                'Toyota Land Cruiser': 550,
                'Mercedes Vito': 650,
                'Mercedes S-Class': 900,
            },
            'r3': {  # Marrakech → Essaouira (185km)
                'Dacia Logan': 800,
                'Mercedes C-Class': 1100,
                'Toyota Land Cruiser': 1500,
                'Mercedes Vito': 1700,
                'Mercedes S-Class': 2500,
            },
        }
        count = 0
        for route_key, vehicle_prices in pricing_map.items():
            route_obj = routes[route_key]['route']
            for vehicle_name, price in vehicle_prices.items():
                vehicle = vehicles[vehicle_name]
                VehicleRoutePricing.objects.update_or_create(
                    vehicle=vehicle,
                    route=route_obj,
                    pickup_zone=None,
                    dropoff_zone=None,
                    defaults={
                        'price': Decimal(str(price)),
                        'cost': Decimal(str(int(price * 0.6))),
                    },
                )
                count += 1

        self.stdout.write(f'  Created {count} route pricing entries')

    # ── Transfer Extras ────────────────────────────────────────

    def _create_transfer_extras(self):
        extras = [
            {'name': 'Child Seat', 'description': 'Suitable for children aged 1-4 years', 'price': Decimal('50'), 'is_per_item': True},
            {'name': 'Meet & Greet Sign', 'description': 'Driver holds a sign with your name at arrivals', 'price': Decimal('0'), 'is_per_item': False},
            {'name': 'Extra Stop', 'description': 'Add an additional stop along your route (max 15 min)', 'price': Decimal('100'), 'is_per_item': True},
            {'name': 'WiFi Hotspot', 'description': 'Portable WiFi device for the journey', 'price': Decimal('30'), 'is_per_item': False},
        ]
        for data in extras:
            TransferExtra.objects.update_or_create(
                name=data['name'], defaults=data,
            )
        self.stdout.write(f'  Created {len(extras)} transfer extras')

    # ── Payment Gateways ───────────────────────────────────────

    def _create_payment_gateways(self):
        gateways = [
            {
                'name': 'Stripe',
                'gateway_type': PaymentGateway.GatewayType.STRIPE,
                'display_name': 'Credit/Debit Card',
                'description': 'Pay securely with your credit or debit card via Stripe.',
                'icon': 'bi-credit-card',
                'is_active': True,
                'is_test_mode': True,
                'order': 1,
            },
            {
                'name': 'PayPal',
                'gateway_type': PaymentGateway.GatewayType.PAYPAL,
                'display_name': 'PayPal',
                'description': 'Pay with your PayPal account.',
                'icon': 'bi-paypal',
                'is_active': True,
                'is_test_mode': True,
                'order': 2,
            },
            {
                'name': 'Cash',
                'gateway_type': PaymentGateway.GatewayType.CASH,
                'display_name': 'Cash to Driver',
                'description': 'Pay the full amount directly to your driver in cash (MAD).',
                'icon': 'bi-cash',
                'is_active': True,
                'is_test_mode': False,
                'order': 3,
            },
        ]
        for data in gateways:
            PaymentGateway.objects.update_or_create(
                gateway_type=data['gateway_type'], defaults=data,
            )
        self.stdout.write(f'  Created {len(gateways)} payment gateways')

    # ── Coupons ────────────────────────────────────────────────

    def _create_coupons(self):
        now = timezone.now()
        coupons = [
            {
                'code': 'WELCOME20',
                'description': '20% off your first transfer booking',
                'discount_type': Coupon.DiscountType.PERCENTAGE,
                'discount_value': Decimal('20'),
                'max_discount_amount': Decimal('500'),
                'usage_limit': 100,
                'usage_per_customer': 1,
                'valid_from': now,
                'valid_until': now + timedelta(days=365),
                'applicable_to': Coupon.ApplicableTo.TRANSFER,
            },
            {
                'code': 'SUMMER2025',
                'description': '50 MAD off transfers (min order 300 MAD)',
                'discount_type': Coupon.DiscountType.FIXED,
                'discount_value': Decimal('50'),
                'min_order_amount': Decimal('300'),
                'valid_from': now.replace(month=6, day=1),
                'valid_until': now.replace(month=9, day=30),
                'applicable_to': Coupon.ApplicableTo.TRANSFER,
            },
            {
                'code': 'VIP100',
                'description': '100 MAD off Premium SUV and Luxury vehicles',
                'discount_type': Coupon.DiscountType.FIXED,
                'discount_value': Decimal('100'),
                'applicable_to': Coupon.ApplicableTo.ALL,
            },
        ]
        for data in coupons:
            Coupon.objects.update_or_create(
                code=data['code'], defaults=data,
            )
        self.stdout.write(f'  Created {len(coupons)} coupons')

    # ── Trips ──────────────────────────────────────────────────

    def _create_trips(self):
        # Trip 1: Essaouira Day Trip
        t1, _ = Trip.objects.update_or_create(
            slug='essaouira-day-trip-from-marrakech',
            defaults={
                'name': 'Essaouira Day Trip from Marrakech',
                'description': (
                    'Escape the bustling streets of Marrakech and discover the charming '
                    'coastal town of Essaouira. Known for its relaxed atmosphere, beautiful '
                    'beaches, and vibrant medina, Essaouira is the perfect day trip destination. '
                    'Drive through the scenic Argan countryside, visit a traditional cooperative, '
                    'and explore the UNESCO-listed medina at your own pace.'
                ),
                'short_description': 'Discover the charming coastal town of Essaouira with an Argan oil stop.',
                'trip_type': 'day_trip',
                'departure_location': 'Marrakech',
                'destinations': 'Essaouira',
                'duration_hours': 10,
                'duration_days': 1,
                'min_participants': 1,
                'max_participants': 15,
                'price_per_person': Decimal('450'),
                'child_price': Decimal('250'),
                'private_tour_price': Decimal('1200'),
                'currency': 'MAD',
                'inclusions': 'Air-conditioned transport,Professional driver,Hotel pickup and drop-off,Argan oil cooperative visit',
                'exclusions': 'Lunch,Drinks,Personal expenses,Tips',
                'itinerary': 'Scenic drive through Argan country,Argan oil cooperative visit,Free time in Essaouira medina,Beach walk,Return to Marrakech',
                'is_featured': True,
                'is_active': True,
                'order': 1,
            },
        )
        self._add_trip_details(t1, [
            'Visit a traditional Argan oil cooperative',
            'Explore the UNESCO-listed Essaouira medina',
            'Walk along the beautiful Atlantic beach',
            'See the famous ramparts and fishing port',
        ], [
            ('Hotel Pickup', 'Marrakech', 'Your driver picks you up from your hotel or riad.', '08:00', 0),
            ('Argan Oil Cooperative', 'Argan Country', 'Visit a womens cooperative and learn about Argan oil production.', '09:30', 45),
            ('Essaouira Free Time', 'Essaouira Medina', 'Explore the medina, port, ramparts, and beaches at your own pace.', '11:00', 240),
            ('Return to Marrakech', 'Marrakech', 'Comfortable drive back to your hotel.', '16:00', 0),
        ], [
            ('Is lunch included?', 'Lunch is not included so you can choose from the many excellent restaurants in the medina.'),
            ('What should I bring?', 'Comfortable shoes, sunscreen, a hat, and a light jacket (it can be windy by the ocean).'),
            ('Can we stop for photos?', 'Absolutely! Just ask your driver and they will be happy to stop at scenic viewpoints.'),
        ])

        # Trip 2: Atlas Mountains
        t2, _ = Trip.objects.update_or_create(
            slug='atlas-mountains-berber-villages',
            defaults={
                'name': 'Atlas Mountains & Berber Villages',
                'description': (
                    'Discover the stunning High Atlas Mountains and visit traditional Berber '
                    'villages. This half-day excursion takes you into the heart of rural Morocco '
                    'where you will experience authentic Berber hospitality, enjoy mint tea in a '
                    'local home, and take in breathtaking mountain views.'
                ),
                'short_description': 'Explore Berber villages and stunning mountain scenery.',
                'trip_type': 'half_day',
                'departure_location': 'Marrakech',
                'destinations': 'Imlil,Asni',
                'duration_hours': 5,
                'duration_days': 1,
                'min_participants': 1,
                'max_participants': 8,
                'price_per_person': Decimal('350'),
                'child_price': Decimal('200'),
                'private_tour_price': Decimal('900'),
                'currency': 'MAD',
                'inclusions': 'Air-conditioned transport,English-speaking guide,Berber mint tea,Hotel pickup and drop-off',
                'exclusions': 'Lunch,Mule ride (optional),Tips',
                'itinerary': 'Drive to Asni,Berber village walk,Tea in local home,Mountain viewpoint,Return',
                'is_featured': True,
                'is_active': True,
                'order': 2,
            },
        )
        self._add_trip_details(t2, [
            'Traditional Berber village visit',
            'Mint tea in a local home',
            'Stunning Atlas Mountain panoramas',
        ], [
            ('Hotel Pickup', 'Marrakech', 'Morning pickup from your accommodation.', '09:00', 0),
            ('Asni Valley', 'Asni', 'Drive through the scenic Ourika Valley to the village of Asni.', '10:00', 30),
            ('Berber Village', 'Imlil', 'Walk through a traditional village, enjoy mint tea, and meet local families.', '10:30', 120),
        ], [
            ('Is this suitable for children?', 'Yes, this trip is family-friendly. The walking is easy and children love the village visit.'),
            ('What fitness level is needed?', 'Basic fitness is sufficient. The walk is gentle with some uphill sections.'),
        ])

        # Trip 3: Sahara 2-Day
        t3, _ = Trip.objects.update_or_create(
            slug='sahara-desert-2-day-experience',
            defaults={
                'name': 'Sahara Desert 2-Day Experience',
                'description': (
                    'Experience the magic of the Sahara Desert on this unforgettable 2-day journey. '
                    'Cross the High Atlas Mountains, drive through dramatic gorges, ride camels into '
                    'the Erg Chebbi dunes, and spend the night in a luxury desert camp under the stars. '
                    'This is the ultimate Moroccan adventure.'
                ),
                'short_description': 'Camel trek, desert camp, and stunning Sahara dunes.',
                'trip_type': 'multi_day',
                'departure_location': 'Marrakech',
                'destinations': 'Ouarzazate,Merzouga,Erg Chebbi',
                'duration_hours': 0,
                'duration_days': 2,
                'min_participants': 2,
                'max_participants': 12,
                'price_per_person': Decimal('2500'),
                'child_price': Decimal('1800'),
                'private_tour_price': Decimal('6000'),
                'currency': 'MAD',
                'inclusions': 'Transport,1 night luxury desert camp,All meals (1 lunch+1 dinner+1 breakfast),Camel trek,Sandboarding,Hotel pickup and drop-off',
                'exclusions': 'Drinks,Personal expenses,Tips,Travel insurance',
                'itinerary': 'Day 1: Marrakech to Merzouga via Atlas & gorges,Day 2: Sunrise camel trek and return',
                'is_featured': True,
                'is_active': True,
                'order': 3,
            },
        )
        self._add_trip_details(t3, [
            'Camel trek into Erg Chebbi dunes',
            'Luxury desert camp under the stars',
            'Cross the High Atlas Mountains',
            'Drive through Todra and Dades Gorges',
            'Sunrise over the Sahara',
        ], [
            ('Depart Marrakech', 'Marrakech', 'Early morning departure across the Tizi nTichka pass.', '07:00', 0),
            ('High Atlas Pass', 'Tizi nTichka', 'Cross the highest road pass in North Africa at 2,260m.', '09:30', 30),
            ('Ouarzazate', 'Ouarzazate', 'Brief stop at the Gateway to the Desert.', '11:00', 30),
            ('Erg Chebbi Dunes', 'Merzouga', 'Camel trek into the dunes to reach your desert camp.', '17:00', 90),
        ], [
            ('What is included in the desert camp?', 'The luxury camp includes a private tent with en-suite bathroom, dinner with traditional music, and breakfast.'),
            ('Is this suitable for older travelers?', 'The camel ride is about 1 hour. If you prefer, a 4x4 can take you to camp instead.'),
            ('What should I pack?', 'Light layers, warm evening clothes, sunscreen, sunglasses, and a camera. The camp provides blankets.'),
        ])

        # Add schedules for all trips
        for trip in [t1, t2, t3]:
            for day in range(7):
                TripSchedule.objects.update_or_create(
                    trip=trip,
                    day_of_week=day,
                    defaults={
                        'departure_time': '08:00:00' if trip != t2 else '09:00:00',
                        'available_spots': trip.max_participants,
                        'is_active': True,
                    },
                )

        self.stdout.write('  Created 3 trips with full content')

    def _add_trip_details(self, trip, highlights, stops, faqs):
        # Highlights
        TripHighlight.objects.filter(trip=trip).delete()
        for i, text in enumerate(highlights):
            TripHighlight.objects.create(trip=trip, text=text, order=i)

        # Itinerary stops
        TripItineraryStop.objects.filter(trip=trip).delete()
        for i, (name, location, desc, _time, duration) in enumerate(stops):
            TripItineraryStop.objects.create(
                trip=trip, name=name, location=location,
                description=desc,
                duration_minutes=duration, order=i,
            )

        # FAQs
        TripFAQ.objects.filter(trip=trip).delete()
        for i, (q, a) in enumerate(faqs):
            TripFAQ.objects.create(trip=trip, question=q, answer=a, order=i)
