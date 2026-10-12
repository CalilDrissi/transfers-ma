import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_emailtemplate_cc_emails'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupplierConfirmation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)),
                ('booking_ref', models.CharField(max_length=50)),
                ('supplier_email', models.EmailField(max_length=254)),
                ('supplier_name', models.CharField(blank=True, max_length=200)),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Supplier Confirmation',
                'verbose_name_plural': 'Supplier Confirmations',
            },
        ),
    ]
