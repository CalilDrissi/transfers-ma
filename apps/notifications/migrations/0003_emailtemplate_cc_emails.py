from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_expand_email_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='emailtemplate',
            name='cc_emails',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Comma-separated email addresses to CC on every email sent with this template.',
            ),
        ),
    ]
