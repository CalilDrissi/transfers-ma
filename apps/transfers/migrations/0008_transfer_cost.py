from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transfers', '0007_transfer_supplier'),
    ]

    operations = [
        migrations.AddField(
            model_name='transfer',
            name='cost',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Amount paid to supplier, in MAD',
                max_digits=10,
                null=True,
                verbose_name='cost',
            ),
        ),
    ]
