"""
Management command for the supplier portal tutorial / demo.

Usage:
    python manage.py demo_supplier --seed       # create isolated demo data
    python manage.py demo_supplier --teardown   # remove all demo data cleanly

The seed creates an isolated "Demo Tours" supplier + portal login + 6 sample
bookings so every portal feature (list, filter, confirm, complete, cancel,
earnings) has real content to act on.  All other production data is untouched.
"""
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

User = get_user_model()

SUPPLIER_NAME = "Demo Tours"
SUPPLIER_EMAIL = "demo-tours@transfers.ma"
PORTAL_PASSWORD = "DemoPass123!"


class Command(BaseCommand):
    help = "Seed / teardown the Demo Tours supplier used for the portal tutorial."

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument("--seed", action="store_true", help="Create demo supplier, login, and sample bookings.")
        group.add_argument("--teardown", action="store_true", help="Remove all demo data (supplier, user, bookings, vehicles, zones, routes).")

    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        if options["seed"]:
            self._seed()
        else:
            self._teardown()

    # ------------------------------------------------------------------
    def _seed(self):
        from apps.vehicles.models import Supplier
        from apps.vehicles.models import VehicleCategory
        from apps.transfers.models import Transfer

        self.stdout.write("=== Seeding Demo Tours ===")

        # 1. Supplier
        supplier, created = Supplier.objects.get_or_create(
            email=SUPPLIER_EMAIL,
            defaults=dict(name=SUPPLIER_NAME, is_active=True),
        )
        if created:
            supplier.name = SUPPLIER_NAME
            supplier.save()
            self.stdout.write(f"  Created Supplier pk={supplier.pk}")
        else:
            self.stdout.write(f"  Supplier already exists pk={supplier.pk}")

        # 2. Portal User
        user, ucreated = User.objects.get_or_create(
            email=SUPPLIER_EMAIL,
            defaults=dict(role="supplier", is_active=True, is_staff=False),
        )
        if ucreated:
            user.set_password(PORTAL_PASSWORD)
            user.save()
            self.stdout.write(f"  Created User pk={user.pk}")
        else:
            # Reset password in case it changed
            user.set_password(PORTAL_PASSWORD)
            user.role = "supplier"
            user.is_active = True
            user.save()
            self.stdout.write(f"  User already exists pk={user.pk} — password reset")

        # Link
        if supplier.user_id != user.pk:
            supplier.user = user
            supplier.save(update_fields=["user"])
            self.stdout.write("  Linked supplier.user")

        # 3. Sample bookings
        cat = VehicleCategory.objects.filter(is_active=True).first()
        if cat is None:
            raise CommandError("No active VehicleCategory found — cannot create sample bookings.")

        now = timezone.now()
        bookings_spec = [
            # (offset_days, status, cost_mad, price_eur, customer_name)
            (-30, "completed", 950, 180, "Jean Martin"),
            (-15, "completed", 1100, 210, "Sophie Müller"),
            (-5,  "confirmed", 800, 150, "Fatima Ait Ahmed"),
            (3,   "confirmed", 1250, 240, "Carlos García"),
            (7,   "pending",   900, 170, "Yuki Tanaka"),
            (14,  "pending",   1050, 200, "Ahmed Benali"),
            (21,  "pending",   750, 140, "Laura Rossi"),
        ]

        created_count = 0
        for offset, status, cost, price, name in bookings_spec:
            ref = f"DEMO-{uuid.uuid4().hex[:6].upper()}"
            Transfer.objects.create(
                booking_ref=ref,
                supplier=supplier,
                vehicle_category=cat,
                customer_name=name,
                customer_email="demo-customer@example.com",
                customer_phone="+212600000000",
                pickup_address="Marrakech Menara Airport, Marrakech",
                pickup_latitude="31.6069",
                pickup_longitude="-8.0363",
                dropoff_address="Jemaa el-Fna, Medina, Marrakech",
                dropoff_latitude="31.6258",
                dropoff_longitude="-7.9892",
                pickup_datetime=now + timedelta(days=offset),
                passengers=2,
                luggage=2,
                base_price=price,
                total_price=price,
                cost=cost,
                currency="EUR",
                status=status,
            )
            created_count += 1

        self.stdout.write(f"  Created {created_count} sample bookings (7 total)")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✓ Demo Tours seeded — portal login: {SUPPLIER_EMAIL} / {PORTAL_PASSWORD}"))

    # ------------------------------------------------------------------
    def _teardown(self):
        from apps.vehicles.models import Supplier
        from apps.vehicles.models import VehicleZonePricing
        from apps.vehicles.models import Vehicle
        from apps.locations.models import Zone, Route, VehicleRoutePricing
        from apps.transfers.models import Transfer

        self.stdout.write("=== Tearing down Demo Tours ===")

        supplier = Supplier.objects.filter(email=SUPPLIER_EMAIL).first()
        if not supplier:
            self.stdout.write(self.style.WARNING("  Demo Tours supplier not found — nothing to clean up."))
            return

        # Bookings
        n = Transfer.objects.filter(supplier=supplier).delete()[0]
        self.stdout.write(f"  Deleted {n} Transfer(s)")

        # Zone pricing on demo vehicles
        demo_vehicles = Vehicle.objects.filter(supplier=supplier)
        n = VehicleZonePricing.objects.filter(vehicle__in=demo_vehicles).delete()[0]
        self.stdout.write(f"  Deleted {n} VehicleZonePricing row(s)")

        # Route pricing on demo vehicles
        n = VehicleRoutePricing.objects.filter(vehicle__in=demo_vehicles).delete()[0]
        self.stdout.write(f"  Deleted {n} VehicleRoutePricing row(s)")

        # Vehicles
        n = demo_vehicles.delete()[0]
        self.stdout.write(f"  Deleted {n} Vehicle(s)")

        # Zones owned by demo supplier
        n = Zone.objects.filter(owner_supplier=supplier).delete()[0]
        self.stdout.write(f"  Deleted {n} Zone(s)")

        # Routes owned by demo supplier
        n = Route.objects.filter(owner_supplier=supplier).delete()[0]
        self.stdout.write(f"  Deleted {n} Route(s)")

        # Portal user
        user = supplier.user
        supplier.user = None
        supplier.save(update_fields=["user"])
        if user:
            user.delete()
            self.stdout.write("  Deleted portal User")

        # Supplier
        supplier.delete()
        self.stdout.write("  Deleted Supplier")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("✓ Demo Tours fully removed."))
