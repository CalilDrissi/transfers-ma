from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transfers', '0010_transfer_status_deposit_paid'),
    ]

    operations = [
        migrations.AddField(
            model_name='transfer',
            name='review_email_sent',
            field=models.BooleanField(default=False, verbose_name='review email sent'),
        ),
    ]
