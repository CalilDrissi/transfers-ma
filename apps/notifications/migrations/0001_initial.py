from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='EmailTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_type', models.CharField(choices=[('booking_customer', 'Customer Confirmation'), ('booking_admin', 'Admin Alert'), ('booking_supplier', 'Supplier Alert')], max_length=30, unique=True)),
                ('subject', models.CharField(max_length=200)),
                ('heading', models.CharField(max_length=200)),
                ('logo', models.ImageField(blank=True, upload_to='email_logos/')),
                ('intro_text', models.TextField(blank=True)),
                ('closing_text', models.TextField(blank=True)),
                ('show_pickup', models.BooleanField(default=True)),
                ('show_dropoff', models.BooleanField(default=True)),
                ('show_datetime', models.BooleanField(default=True)),
                ('show_vehicle', models.BooleanField(default=True)),
                ('show_passengers', models.BooleanField(default=True)),
                ('show_trip_type', models.BooleanField(default=True)),
                ('show_flight_number', models.BooleanField(default=True)),
                ('show_special_requests', models.BooleanField(default=True)),
                ('show_price', models.BooleanField(default=True)),
                ('show_customer_info', models.BooleanField(default=True)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Email Template',
                'verbose_name_plural': 'Email Templates',
            },
        ),
    ]
