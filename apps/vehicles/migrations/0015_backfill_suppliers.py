from django.db import migrations


def backfill_suppliers(apps, schema_editor):
    """Create Supplier rows from distinct vehicle.supplier_name + supplier_email,
    deduping case- and whitespace-insensitively, then link each Vehicle."""
    Vehicle = apps.get_model('vehicles', 'Vehicle')
    Supplier = apps.get_model('vehicles', 'Supplier')

    name_map = {}  # normalized_name -> Supplier instance
    for v in Vehicle.objects.exclude(supplier_name='').iterator():
        raw_name = (v.supplier_name or '').strip()
        if not raw_name:
            continue
        key = raw_name.lower()
        supplier = name_map.get(key)
        if not supplier:
            supplier, _ = Supplier.objects.get_or_create(
                name=raw_name,
                defaults={'email': (v.supplier_email or '').strip()},
            )
            # If existing supplier had no email but vehicle does, fill it
            if not supplier.email and v.supplier_email:
                supplier.email = v.supplier_email.strip()
                supplier.save(update_fields=['email'])
            name_map[key] = supplier
        v.supplier = supplier
        v.save(update_fields=['supplier'])


def reverse_backfill(apps, schema_editor):
    """Reverse: just clear the FK. Suppliers stay (text fields are still intact)."""
    Vehicle = apps.get_model('vehicles', 'Vehicle')
    Vehicle.objects.update(supplier=None)


class Migration(migrations.Migration):

    dependencies = [
        ('vehicles', '0014_add_supplier_model'),
    ]

    operations = [
        migrations.RunPython(backfill_suppliers, reverse_backfill),
    ]
