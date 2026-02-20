from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('locations', '0012_alter_zone_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='routepickupzone',
            name='price_adjustment',
            field=models.DecimalField(
                decimal_places=2, default=0, help_text='Amount added to vehicle price when pickup is in this zone',
                max_digits=10, verbose_name='price adjustment',
            ),
        ),
        migrations.AddField(
            model_name='routedropoffzone',
            name='price_adjustment',
            field=models.DecimalField(
                decimal_places=2, default=0, help_text='Amount added to vehicle price when dropoff is in this zone',
                max_digits=10, verbose_name='price adjustment',
            ),
        ),
    ]
