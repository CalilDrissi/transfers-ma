from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vehicles', '0011_vehicle_client_description_and_more'),
        ('rental_companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='vehicle',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='vehicles',
                to='rental_companies.rentalcompany',
                verbose_name='rental company',
            ),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='doors',
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name='doors'),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='transmission',
            field=models.CharField(
                blank=True,
                choices=[('automatic', 'Automatic'), ('manual', 'Manual')],
                max_length=20,
                verbose_name='transmission',
            ),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='mileage_limit_per_day',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='mileage limit per day'),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='extra_mileage_fee',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True, verbose_name='extra mileage fee'),
        ),
    ]
