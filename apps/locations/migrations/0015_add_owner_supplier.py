from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Add owner_supplier FK to Zone and Route for supplier-portal scoping."""

    dependencies = [
        ('locations', '0014_vehicleroutepricing_zone_adjustments'),
        ('vehicles', '0016_supplier_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='zone',
            name='owner_supplier',
            field=models.ForeignKey(
                blank=True,
                help_text='If set, this zone was created by and belongs to this supplier.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='zones',
                to='vehicles.supplier',
                verbose_name='owner supplier',
            ),
        ),
        migrations.AddField(
            model_name='route',
            name='owner_supplier',
            field=models.ForeignKey(
                blank=True,
                help_text='If set, this route was created by and belongs to this supplier.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='routes',
                to='vehicles.supplier',
                verbose_name='owner supplier',
            ),
        ),
    ]
