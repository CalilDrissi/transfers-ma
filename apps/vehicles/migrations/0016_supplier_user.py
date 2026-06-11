from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Add optional User login link to Supplier (for the supplier self-service portal)."""

    dependencies = [
        ('vehicles', '0015_backfill_suppliers'),
        ('accounts', '0009_add_supplier_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplier',
            name='user',
            field=models.OneToOneField(
                blank=True,
                help_text='User account that can log into the supplier portal.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='supplier_account',
                to='accounts.user',
                verbose_name='portal user',
            ),
        ),
    ]
