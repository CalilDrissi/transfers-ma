from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transfers', '0005_transfer_custom_field_values'),
    ]

    operations = [
        migrations.AddField(
            model_name='transfer',
            name='pricing_method',
            field=models.CharField(blank=True, choices=[('zone', 'Zone'), ('route', 'Route')], default='', max_length=10, verbose_name='pricing method'),
        ),
    ]
