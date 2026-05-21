from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transfers', '0008_transfer_cost'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlockedDate',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_date', models.DateField(verbose_name='start date')),
                ('end_date', models.DateField(help_text='Same as start date for single-day blocks', verbose_name='end date')),
                ('reason', models.CharField(help_text='Internal label, e.g. "Christmas Holiday", "Fleet maintenance"', max_length=200, verbose_name='reason')),
                ('customer_message', models.TextField(blank=True, help_text='Shown to customers who try to book a blocked date. Leave blank for the default generic message.', verbose_name='customer message')),
                ('is_active', models.BooleanField(default=True, help_text='Uncheck to disable without deleting', verbose_name='active')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
            ],
            options={
                'verbose_name': 'blocked date',
                'verbose_name_plural': 'blocked dates',
                'ordering': ['-start_date'],
            },
        ),
    ]
