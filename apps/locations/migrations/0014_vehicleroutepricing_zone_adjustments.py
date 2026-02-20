from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('locations', '0013_add_price_adjustment_to_subzones'),
    ]

    operations = [
        migrations.AddField(
            model_name='vehicleroutepricing',
            name='pickup_zone_adjustments',
            field=models.JSONField(
                blank=True, default=dict,
                help_text='Per sub-origin price adjustments: {"zone_id": "amount", ...}',
                verbose_name='pickup zone adjustments',
            ),
        ),
        migrations.AddField(
            model_name='vehicleroutepricing',
            name='dropoff_zone_adjustments',
            field=models.JSONField(
                blank=True, default=dict,
                help_text='Per sub-destination price adjustments: {"zone_id": "amount", ...}',
                verbose_name='dropoff zone adjustments',
            ),
        ),
    ]
