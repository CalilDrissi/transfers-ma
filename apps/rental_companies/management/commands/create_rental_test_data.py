import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import User
from apps.rental_companies.models import CompanyReview, RentalCompany
from apps.rentals.models import InsuranceOption, Rental, RentalExtra
from apps.vehicles.models import Vehicle, VehicleCategory, VehicleFeature


PASSWORD = 'testpass123'

COMPANIES = [
    {
        'company_name': 'Atlas Car Rental',
        'city': 'Agadir',
        'email': 'atlas@test.com',
        'owner_email': 'atlas@test.com',
        'owner_first': 'Youssef',
        'owner_last': 'Amrani',
        'phone': '+212528123456',
        'whatsapp': '+212661123456',
        'address': 'Boulevard Hassan II, Agadir',
        'status': RentalCompany.Status.APPROVED,
    },
    {
        'company_name': 'Sahara Rent',
        'city': 'Marrakech',
        'email': 'sahara@test.com',
        'owner_email': 'sahara@test.com',
        'owner_first': 'Fatima',
        'owner_last': 'Benali',
        'phone': '+212524987654',
        'whatsapp': '+212662987654',
        'address': 'Avenue Mohammed V, Marrakech',
        'status': RentalCompany.Status.APPROVED,
    },
    {
        'company_name': 'Casa Cars',
        'city': 'Casablanca',
        'email': 'casa@test.com',
        'owner_email': 'casa@test.com',
        'owner_first': 'Omar',
        'owner_last': 'Tazi',
        'phone': '+212522456789',
        'whatsapp': '+212663456789',
        'address': 'Rue Abdelmoumen, Casablanca',
        'status': RentalCompany.Status.APPROVED,
    },
    {
        'company_name': 'New Morocco Rides',
        'city': 'Rabat',
        'email': 'newrides@test.com',
        'owner_email': 'newrides@test.com',
        'owner_first': 'Karim',
        'owner_last': 'Idrissi',
        'phone': '+212537111222',
        'whatsapp': '+212664111222',
        'address': 'Avenue de France, Rabat',
        'status': RentalCompany.Status.PENDING,
    },
]

VEHICLE_SPECS = [
    {
        'name': 'Dacia Logan',
        'category_slug': 'economy',
        'transmission': 'manual',
        'fuel_type': 'diesel',
        'daily_rate': 250,
        'passengers': 5,
        'luggage': 3,
        'doors': 4,
        'year': 2023,
    },
    {
        'name': 'Renault Clio',
        'category_slug': 'economy',
        'transmission': 'manual',
        'fuel_type': 'petrol',
        'daily_rate': 280,
        'passengers': 5,
        'luggage': 2,
        'doors': 4,
        'year': 2023,
    },
    {
        'name': 'Peugeot 208',
        'category_slug': 'economy',
        'transmission': 'automatic',
        'fuel_type': 'petrol',
        'daily_rate': 320,
        'passengers': 5,
        'luggage': 2,
        'doors': 4,
        'year': 2024,
    },
    {
        'name': 'Volkswagen Golf',
        'category_slug': 'comfort',
        'transmission': 'automatic',
        'fuel_type': 'diesel',
        'daily_rate': 400,
        'passengers': 5,
        'luggage': 3,
        'doors': 4,
        'year': 2024,
    },
    {
        'name': 'Hyundai Tucson',
        'category_slug': 'suv',
        'transmission': 'automatic',
        'fuel_type': 'diesel',
        'daily_rate': 550,
        'passengers': 5,
        'luggage': 4,
        'doors': 4,
        'year': 2024,
    },
    {
        'name': 'Dacia Duster',
        'category_slug': 'suv',
        'transmission': 'manual',
        'fuel_type': 'diesel',
        'daily_rate': 450,
        'passengers': 5,
        'luggage': 4,
        'doors': 4,
        'year': 2023,
    },
    {
        'name': 'Mercedes C-Class',
        'category_slug': 'comfort',
        'transmission': 'automatic',
        'fuel_type': 'petrol',
        'daily_rate': 700,
        'passengers': 5,
        'luggage': 3,
        'doors': 4,
        'year': 2024,
    },
    {
        'name': 'Toyota Land Cruiser',
        'category_slug': 'suv',
        'transmission': 'automatic',
        'fuel_type': 'diesel',
        'daily_rate': 1200,
        'passengers': 7,
        'luggage': 5,
        'doors': 4,
        'year': 2024,
    },
]

INSURANCE_OPTIONS = [
    {
        'name': 'Basic',
        'price_per_day': 50,
        'description': 'Basic third-party liability coverage.',
        'coverage_details': 'Covers third-party bodily injury and property damage. Excess: 5,000 MAD.',
        'order': 1,
    },
    {
        'name': 'Full Coverage',
        'price_per_day': 120,
        'description': 'Comprehensive coverage with reduced excess.',
        'coverage_details': 'Covers collision damage, theft, third-party liability. Excess: 2,000 MAD.',
        'order': 2,
    },
    {
        'name': 'Premium',
        'price_per_day': 200,
        'description': 'Zero-excess premium coverage including roadside assistance.',
        'coverage_details': 'All-risk coverage with zero excess. Includes roadside assistance, windscreen, and tire damage.',
        'order': 3,
    },
]

RENTAL_EXTRAS = [
    {
        'name': 'GPS Navigation',
        'price_per_day': 30,
        'description': 'Portable GPS navigation device with Morocco maps.',
        'icon': 'bi-geo-alt',
        'max_quantity': 1,
        'order': 1,
    },
    {
        'name': 'Child Seat',
        'price_per_day': 40,
        'description': 'Safety-certified child car seat (0-12 years).',
        'icon': 'bi-person',
        'max_quantity': 2,
        'order': 2,
    },
    {
        'name': 'Additional Driver',
        'price_per_day': 50,
        'description': 'Add an extra driver to the rental agreement.',
        'icon': 'bi-people',
        'max_quantity': 3,
        'order': 3,
    },
    {
        'name': 'WiFi Hotspot',
        'price_per_day': 25,
        'description': 'Portable 4G WiFi hotspot for up to 5 devices.',
        'icon': 'bi-wifi',
        'max_quantity': 1,
        'order': 4,
    },
]

SAMPLE_CUSTOMERS = [
    ('Jean Dupont', 'jean.dupont@example.com', '+33612345678'),
    ('Sarah Johnson', 'sarah.johnson@example.com', '+44789123456'),
    ('Hans Mueller', 'hans.mueller@example.com', '+49170123456'),
    ('Maria Garcia', 'maria.garcia@example.com', '+34612345678'),
    ('Ahmed Alaoui', 'ahmed.alaoui@example.com', '+212661999888'),
]

REVIEW_COMMENTS = [
    (5, 'Excellent service!', 'Car was in perfect condition and the team was very professional. Highly recommend!'),
    (4, 'Very good experience', 'Smooth pickup and return process. The car was clean and well-maintained.'),
    (5, 'Best rental in Morocco', 'Amazing service from start to finish. Will definitely rent again on my next trip.'),
    (3, 'Decent service', 'Car was okay, but the pickup took a bit longer than expected.'),
    (4, 'Great value for money', 'Good car at a reasonable price. The company was responsive on WhatsApp.'),
]


class Command(BaseCommand):
    help = 'Create test data for the rental car marketplace'

    def handle(self, *args, **options):
        self.stdout.write('Creating rental marketplace test data...\n')

        categories = self._create_categories()
        features = self._create_features()
        insurance_options = self._create_insurance_options()
        extras = self._create_extras()
        companies = self._create_companies()

        approved_companies = [c for c in companies if c.status == RentalCompany.Status.APPROVED]
        for company in approved_companies:
            vehicles = self._create_vehicles(company, categories, features)
            self._create_bookings(company, vehicles, insurance_options)
            self._create_reviews(company)

        self.stdout.write(self.style.SUCCESS('\nAll rental test data created successfully!'))

    def _create_categories(self):
        """Create or get vehicle categories for rentals."""
        category_defs = [
            {'name': 'Economy', 'slug': 'economy', 'max_passengers': 5, 'max_luggage': 2, 'order': 1,
             'description': 'Affordable and fuel-efficient cars for budget-conscious travellers.'},
            {'name': 'Comfort', 'slug': 'comfort', 'max_passengers': 5, 'max_luggage': 3, 'order': 2,
             'description': 'Mid-range vehicles offering a balance of comfort and value.'},
            {'name': 'SUV', 'slug': 'suv', 'max_passengers': 7, 'max_luggage': 5, 'order': 3,
             'description': 'Spacious SUVs ideal for families and exploring off-road destinations.'},
        ]
        categories = {}
        for cat_def in category_defs:
            cat, created = VehicleCategory.objects.get_or_create(
                slug=cat_def['slug'],
                defaults=cat_def,
            )
            categories[cat.slug] = cat
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  Category "{cat.name}": {status}')
        return categories

    def _create_features(self):
        """Create or get vehicle features."""
        feature_names = ['AC', 'Bluetooth', 'GPS', 'USB', 'Cruise Control', 'Leather Seats', 'Backup Camera']
        features = {}
        for name in feature_names:
            feat, created = VehicleFeature.objects.get_or_create(name=name)
            features[name] = feat
        self.stdout.write(f'  Features: {len(features)} ready')
        return features

    def _create_insurance_options(self):
        """Create insurance options."""
        options = []
        for opt_def in INSURANCE_OPTIONS:
            opt, created = InsuranceOption.objects.get_or_create(
                name=opt_def['name'],
                defaults={
                    'price_per_day': Decimal(str(opt_def['price_per_day'])),
                    'description': opt_def['description'],
                    'coverage_details': opt_def['coverage_details'],
                    'order': opt_def['order'],
                },
            )
            options.append(opt)
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  Insurance "{opt.name}" ({opt.price_per_day} MAD/day): {status}')
        return options

    def _create_extras(self):
        """Create rental extras."""
        extras = []
        for extra_def in RENTAL_EXTRAS:
            extra, created = RentalExtra.objects.get_or_create(
                name=extra_def['name'],
                defaults={
                    'price_per_day': Decimal(str(extra_def['price_per_day'])),
                    'description': extra_def['description'],
                    'icon': extra_def['icon'],
                    'max_quantity': extra_def['max_quantity'],
                    'order': extra_def['order'],
                },
            )
            extras.append(extra)
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  Extra "{extra.name}" ({extra.price_per_day} MAD/day): {status}')
        return extras

    def _create_companies(self):
        """Create rental companies and their owner users."""
        companies = []
        for comp_def in COMPANIES:
            # Check if company already exists
            existing = RentalCompany.objects.filter(slug=slugify(comp_def['company_name'])).first()
            if existing:
                self.stdout.write(f'  Company "{existing.company_name}": Already exists')
                companies.append(existing)
                continue

            # Create owner user
            user, user_created = User.objects.get_or_create(
                email=comp_def['owner_email'],
                defaults={
                    'first_name': comp_def['owner_first'],
                    'last_name': comp_def['owner_last'],
                    'role': User.Role.RENTAL_COMPANY,
                    'is_verified': True,
                    'phone': comp_def['phone'],
                },
            )
            if user_created:
                user.set_password(PASSWORD)
                user.save()

            company = RentalCompany.objects.create(
                owner=user,
                company_name=comp_def['company_name'],
                slug=slugify(comp_def['company_name']),
                email=comp_def['email'],
                phone=comp_def['phone'],
                whatsapp=comp_def.get('whatsapp', ''),
                address=comp_def['address'],
                city=comp_def['city'],
                status=comp_def['status'],
                description=f"{comp_def['company_name']} — quality car rental services in {comp_def['city']}.",
                short_description=f"Reliable car rental in {comp_def['city']}",
                offers_delivery=True,
                delivery_fee=Decimal('100.00'),
                delivery_radius_km=30,
                offers_airport_pickup=True,
                minimum_rental_days=1,
                maximum_rental_days=30,
                minimum_driver_age=21,
                accepted_payment_methods=['cash', 'bank_transfer'],
                pickup_cities=[comp_def['city']],
                operating_hours={
                    'mon': {'open': '08:00', 'close': '20:00'},
                    'tue': {'open': '08:00', 'close': '20:00'},
                    'wed': {'open': '08:00', 'close': '20:00'},
                    'thu': {'open': '08:00', 'close': '20:00'},
                    'fri': {'open': '08:00', 'close': '20:00'},
                    'sat': {'open': '09:00', 'close': '18:00'},
                    'sun': {'open': '09:00', 'close': '14:00'},
                },
                approved_at=timezone.now() if comp_def['status'] == RentalCompany.Status.APPROVED else None,
            )
            companies.append(company)
            self.stdout.write(f'  Company "{company.company_name}" ({company.status}): Created')

        return companies

    def _create_vehicles(self, company, categories, features):
        """Create rental vehicles for a company."""
        # Each approved company gets 5-8 vehicles (pick a random subset)
        num_vehicles = random.randint(5, 8)
        specs_sample = random.sample(VEHICLE_SPECS, min(num_vehicles, len(VEHICLE_SPECS)))

        vehicles = []
        plate_counter = random.randint(1000, 9999)
        for spec in specs_sample:
            category = categories.get(spec['category_slug'])
            if not category:
                continue

            plate_counter += 1
            plate_prefix = company.city[:3].upper()
            license_plate = f"{plate_prefix}-{plate_counter}"

            # Check if vehicle already exists for this company
            existing = Vehicle.objects.filter(
                company=company, name=spec['name'],
            ).first()
            if existing:
                vehicles.append(existing)
                continue

            daily = Decimal(str(spec['daily_rate']))
            vehicle = Vehicle.objects.create(
                category=category,
                name=spec['name'],
                license_plate=license_plate,
                year=spec['year'],
                passengers=spec['passengers'],
                luggage=spec['luggage'],
                doors=spec['doors'],
                transmission=spec['transmission'],
                fuel_type=spec['fuel_type'],
                status=Vehicle.Status.AVAILABLE,
                service_type=Vehicle.ServiceType.RENTAL,
                company=company,
                is_active=True,
                is_available_for_rental_marketplace=True,
                daily_rate=daily,
                weekly_rate=daily * 6,
                monthly_rate=daily * 22,
                rental_deposit=daily * 3,
                mileage_limit_per_day=300,
                extra_mileage_fee=Decimal('1.50'),
                fuel_policy=Vehicle.FuelPolicy.FULL_TO_FULL,
            )

            # Assign features: AC, Bluetooth, USB for all; GPS for comfort+; extras for premium
            base_features = ['AC', 'Bluetooth', 'USB']
            for feat_name in base_features:
                if feat_name in features:
                    vehicle.features.add(features[feat_name])

            if spec['category_slug'] in ('comfort', 'suv'):
                for feat_name in ['GPS', 'Cruise Control']:
                    if feat_name in features:
                        vehicle.features.add(features[feat_name])

            if spec['daily_rate'] >= 700:
                for feat_name in ['Leather Seats', 'Backup Camera']:
                    if feat_name in features:
                        vehicle.features.add(features[feat_name])

            vehicles.append(vehicle)
            self.stdout.write(
                f'    Vehicle "{vehicle.name}" ({category.name}, {daily} MAD/day): Created'
            )

        return vehicles

    def _create_bookings(self, company, vehicles, insurance_options):
        """Create sample rental bookings for a company."""
        if not vehicles:
            return

        statuses_to_create = [
            Rental.Status.CONFIRMED,
            Rental.Status.COMPLETED,
            Rental.Status.ACTIVE,
            Rental.Status.CANCELLED,
            Rental.Status.PENDING,
        ]

        num_bookings = random.randint(3, 5)
        today = date.today()

        for i in range(num_bookings):
            customer = random.choice(SAMPLE_CUSTOMERS)
            vehicle = random.choice(vehicles)
            status = statuses_to_create[i % len(statuses_to_create)]
            daily_rate = vehicle.daily_rate or Decimal('300')

            # Determine dates based on status
            if status == Rental.Status.COMPLETED:
                pickup = today - timedelta(days=random.randint(20, 60))
                total_days = random.randint(3, 7)
            elif status == Rental.Status.ACTIVE:
                pickup = today - timedelta(days=random.randint(1, 3))
                total_days = random.randint(5, 10)
            elif status == Rental.Status.CANCELLED:
                pickup = today + timedelta(days=random.randint(5, 20))
                total_days = random.randint(2, 5)
            else:
                pickup = today + timedelta(days=random.randint(3, 30))
                total_days = random.randint(2, 7)

            return_date = pickup + timedelta(days=total_days)
            vehicle_total = daily_rate * total_days
            insurance = random.choice(insurance_options)
            insurance_total = insurance.price_per_day * total_days
            total_price = vehicle_total + insurance_total
            commission_rate = company.commission_rate
            commission_amount = total_price * commission_rate / 100
            payout_amount = total_price - commission_amount

            # Check for existing booking to keep idempotent
            existing_booking = Rental.objects.filter(
                company=company,
                customer_email=customer[1],
                pickup_date=pickup,
                vehicle=vehicle,
            ).first()
            if existing_booking:
                continue

            rental = Rental.objects.create(
                company=company,
                vehicle=vehicle,
                customer_name=customer[0],
                customer_email=customer[1],
                customer_phone=customer[2],
                pickup_date=pickup,
                return_date=return_date,
                actual_return_date=return_date if status == Rental.Status.COMPLETED else None,
                pickup_location=f"{company.city} Office",
                dropoff_location=f"{company.city} Office",
                insurance=insurance,
                insurance_total=insurance_total,
                daily_rate=daily_rate,
                total_days=total_days,
                vehicle_total=vehicle_total,
                total_price=total_price,
                deposit_amount=vehicle.rental_deposit or Decimal('0'),
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                company_payout_amount=payout_amount,
                status=status,
                cancellation_reason='Travel plans changed' if status == Rental.Status.CANCELLED else '',
            )
            self.stdout.write(
                f'    Booking {rental.booking_ref} ({status}): Created'
            )

    def _create_reviews(self, company):
        """Create sample reviews for a company."""
        # Get completed rentals for this company
        completed_rentals = Rental.objects.filter(
            company=company,
            status=Rental.Status.COMPLETED,
        ).exclude(
            review__isnull=False,
        )

        num_reviews = min(random.randint(2, 3), completed_rentals.count())

        for rental in completed_rentals[:num_reviews]:
            rating, title, comment = random.choice(REVIEW_COMMENTS)

            review, created = CompanyReview.objects.get_or_create(
                rental=rental,
                defaults={
                    'company': company,
                    'customer_name': rental.customer_name,
                    'customer_email': rental.customer_email,
                    'rating': rating,
                    'title': title,
                    'comment': comment,
                    'vehicle_condition_rating': min(5, rating + random.randint(-1, 1)),
                    'service_rating': min(5, rating + random.randint(-1, 1)),
                    'value_rating': min(5, rating + random.randint(0, 1)),
                    'is_published': True,
                },
            )
            if created:
                self.stdout.write(f'    Review {rating} stars for {company.company_name}: Created')

        # Update company rating aggregates
        reviews = CompanyReview.objects.filter(company=company)
        if reviews.exists():
            from django.db.models import Avg
            avg = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
            company.average_rating = Decimal(str(round(avg, 2)))
            company.total_reviews = reviews.count()
            company.total_bookings = Rental.objects.filter(company=company).count()
            company.save(update_fields=['average_rating', 'total_reviews', 'total_bookings'])
