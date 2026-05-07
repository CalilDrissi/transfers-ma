from django.db import migrations, models
import django.db.models.deletion


def backfill_transfer_supplier(apps, schema_editor):
    """Copy supplier from assigned vehicle into Transfer.supplier where possible."""
    Transfer = apps.get_model('transfers', 'Transfer')
    for t in Transfer.objects.filter(vehicle__isnull=False, vehicle__supplier__isnull=False).iterator():
        t.supplier_id = t.vehicle.supplier_id
        t.save(update_fields=['supplier'])


def reverse_backfill(apps, schema_editor):
    Transfer = apps.get_model('transfers', 'Transfer')
    Transfer.objects.update(supplier=None)


class Migration(migrations.Migration):

    dependencies = [
        ('transfers', '0006_transfer_pricing_method'),
        ('vehicles', '0015_backfill_suppliers'),
    ]

    operations = [
        migrations.AddField(
            model_name='transfer',
            name='supplier',
            field=models.ForeignKey(
                blank=True,
                help_text='Which supplier fulfills this booking. Auto-set from assigned vehicle.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='transfers',
                to='vehicles.supplier',
                verbose_name='supplier',
            ),
        ),
        migrations.RunPython(backfill_transfer_supplier, reverse_backfill),
    ]
