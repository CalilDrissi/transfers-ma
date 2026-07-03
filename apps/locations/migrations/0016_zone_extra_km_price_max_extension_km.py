from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('locations', '0015_add_owner_supplier'),
    ]

    operations = [
        migrations.AddField(
            model_name='zone',
            name='extra_km_price',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Surcharge per km when dropoff exceeds the zone radius (0 = disabled)',
                max_digits=8,
                verbose_name='extra km price',
            ),
        ),
        migrations.AddField(
            model_name='zone',
            name='max_extension_km',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Maximum km beyond zone radius still served (0 = hard cutoff, no extension)',
                max_digits=8,
                verbose_name='max extension km',
            ),
        ),
    ]
