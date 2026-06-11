from django.db import migrations, models


class Migration(migrations.Migration):
    """Add SUPPLIER choice to User.Role (CharField — no DB schema change, migration for state tracking)."""

    dependencies = [
        ('accounts', '0008_customfield'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Admin'),
                    ('manager', 'Manager'),
                    ('driver', 'Driver'),
                    ('client', 'Client'),
                    ('rental_company', 'Rental Company'),
                    ('supplier', 'Supplier'),
                ],
                default='client',
                max_length=20,
                verbose_name='role',
            ),
        ),
    ]
