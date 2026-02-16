from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0002_alter_rental_pickup_location_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='RentalExtraBooking',
        ),
        migrations.DeleteModel(
            name='Rental',
        ),
        migrations.DeleteModel(
            name='RentalExtra',
        ),
        migrations.DeleteModel(
            name='InsuranceOption',
        ),
    ]
