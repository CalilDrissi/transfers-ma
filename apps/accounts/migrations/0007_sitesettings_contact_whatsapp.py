from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_alter_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='contact_whatsapp',
            field=models.CharField(blank=True, help_text='WhatsApp number for contact (e.g. 212600000000)', max_length=20, verbose_name='Contact WhatsApp'),
        ),
    ]
