from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_coupon_payment_coupon_discount_payment_coupon_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='is_deposit',
            field=models.BooleanField(
                default=False,
                help_text='True when client paid only the deposit amount, not the full price',
                verbose_name='is deposit payment',
            ),
        ),
    ]
