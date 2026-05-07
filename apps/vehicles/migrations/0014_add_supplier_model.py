from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vehicles', '0013_add_supplier_email'),
    ]

    operations = [
        migrations.CreateModel(
            name='Supplier',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, verbose_name='name')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='email')),
                ('phone', models.CharField(blank=True, max_length=30, verbose_name='phone')),
                ('notes', models.TextField(blank=True, verbose_name='notes')),
                ('is_active', models.BooleanField(default=True, verbose_name='active')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
            ],
            options={
                'verbose_name': 'supplier',
                'verbose_name_plural': 'suppliers',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='vehicle',
            name='supplier',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='vehicles',
                to='vehicles.supplier',
                verbose_name='supplier',
            ),
        ),
    ]
