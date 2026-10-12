from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rental_companies', '0001_initial'),
        ('vehicles', '0016_supplier_user'),
    ]

    operations = [
        migrations.CreateModel(
            name='VehicleAvailability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_date', models.DateField(verbose_name='start date')),
                ('end_date', models.DateField(verbose_name='end date')),
                ('reason', models.CharField(choices=[('booked', 'Booked'), ('maintenance', 'Maintenance'), ('unavailable', 'Unavailable')], default='unavailable', max_length=20, verbose_name='reason')),
                ('notes', models.TextField(blank=True, verbose_name='notes')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availability_blocks', to='rental_companies.rentalcompany')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availability_blocks', to='vehicles.vehicle')),
            ],
            options={
                'verbose_name': 'vehicle availability block',
                'verbose_name_plural': 'vehicle availability blocks',
                'ordering': ['start_date'],
            },
        ),
    ]
