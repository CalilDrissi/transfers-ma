from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='emailtemplate',
            name='email_type',
            field=models.CharField(
                choices=[
                    ('booking_customer', 'Customer Confirmation'),
                    ('booking_admin', 'Admin Alert'),
                    ('booking_supplier', 'Supplier Alert'),
                    ('zone_customer', 'Zone - Customer Confirmation'),
                    ('zone_admin', 'Zone - Admin Alert'),
                    ('zone_supplier', 'Zone - Supplier Alert'),
                    ('route_customer', 'Route - Customer Confirmation'),
                    ('route_admin', 'Route - Admin Alert'),
                    ('route_supplier', 'Route - Supplier Alert'),
                ],
                max_length=30,
                unique=True,
            ),
        ),
    ]
