from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transfers', '0009_blockeddate'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transfer',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('deposit_paid', 'Deposit Paid'),
                    ('confirmed', 'Confirmed'),
                    ('assigned', 'Driver Assigned'),
                    ('in_progress', 'In Progress'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                    ('no_show', 'No Show'),
                ],
                default='pending',
                max_length=20,
                verbose_name='status',
            ),
        ),
    ]
