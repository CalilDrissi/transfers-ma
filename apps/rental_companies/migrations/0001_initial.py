from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RentalCompany',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company_name', models.CharField(max_length=200, verbose_name='company name')),
                ('slug', models.SlugField(max_length=200, unique=True, verbose_name='slug')),
                ('description', models.TextField(blank=True, verbose_name='description')),
                ('short_description', models.CharField(blank=True, max_length=300, verbose_name='short description')),
                ('logo', models.ImageField(blank=True, null=True, upload_to='rental_companies/logos/', verbose_name='logo')),
                ('cover_image', models.ImageField(blank=True, null=True, upload_to='rental_companies/covers/', verbose_name='cover image')),
                ('email', models.EmailField(max_length=254, verbose_name='email')),
                ('phone', models.CharField(max_length=20, verbose_name='phone')),
                ('whatsapp', models.CharField(blank=True, max_length=20, verbose_name='whatsapp')),
                ('website', models.URLField(blank=True, verbose_name='website')),
                ('address', models.TextField(verbose_name='address')),
                ('city', models.CharField(max_length=100, verbose_name='city')),
                ('region', models.CharField(blank=True, max_length=100, verbose_name='region')),
                ('postal_code', models.CharField(blank=True, max_length=10, verbose_name='postal code')),
                ('latitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True, verbose_name='latitude')),
                ('longitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True, verbose_name='longitude')),
                ('ice_number', models.CharField(blank=True, max_length=20, verbose_name='ICE number')),
                ('rc_number', models.CharField(blank=True, max_length=20, verbose_name='RC number')),
                ('tax_id', models.CharField(blank=True, max_length=30, verbose_name='tax ID')),
                ('license_number', models.CharField(blank=True, max_length=50, verbose_name='license number')),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved'), ('suspended', 'Suspended'), ('rejected', 'Rejected')], default='pending', max_length=20, verbose_name='status')),
                ('tier', models.CharField(choices=[('basic', 'Basic'), ('premium', 'Premium'), ('enterprise', 'Enterprise')], default='basic', max_length=20, verbose_name='tier')),
                ('commission_rate', models.DecimalField(decimal_places=2, default=15.0, max_digits=5, verbose_name='commission rate')),
                ('is_featured', models.BooleanField(default=False, verbose_name='featured')),
                ('priority_order', models.IntegerField(default=0, verbose_name='priority order')),
                ('offers_delivery', models.BooleanField(default=False, verbose_name='offers delivery')),
                ('delivery_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='delivery fee')),
                ('delivery_radius_km', models.PositiveIntegerField(default=0, verbose_name='delivery radius km')),
                ('offers_airport_pickup', models.BooleanField(default=False, verbose_name='offers airport pickup')),
                ('minimum_rental_days', models.PositiveIntegerField(default=1, verbose_name='minimum rental days')),
                ('maximum_rental_days', models.PositiveIntegerField(default=30, verbose_name='maximum rental days')),
                ('minimum_driver_age', models.PositiveIntegerField(default=21, verbose_name='minimum driver age')),
                ('accepted_payment_methods', models.JSONField(blank=True, default=list, verbose_name='accepted payment methods')),
                ('operating_hours', models.JSONField(blank=True, default=dict, verbose_name='operating hours')),
                ('pickup_cities', models.JSONField(blank=True, default=list, verbose_name='pickup cities')),
                ('average_rating', models.DecimalField(decimal_places=2, default=0, max_digits=3, verbose_name='average rating')),
                ('total_reviews', models.PositiveIntegerField(default=0, verbose_name='total reviews')),
                ('total_bookings', models.PositiveIntegerField(default=0, verbose_name='total bookings')),
                ('admin_notes', models.TextField(blank=True, verbose_name='admin notes')),
                ('rejection_reason', models.TextField(blank=True, verbose_name='rejection reason')),
                ('approved_at', models.DateTimeField(blank=True, null=True, verbose_name='approved at')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_companies', to=settings.AUTH_USER_MODEL)),
                ('owner', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='rental_company', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'rental company',
                'verbose_name_plural': 'rental companies',
                'ordering': ['-is_featured', '-priority_order', '-average_rating'],
            },
        ),
        migrations.CreateModel(
            name='CompanyDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(choices=[('business_license', 'Business License'), ('rental_license', 'Car Rental License'), ('insurance', 'Insurance Certificate'), ('tax_certificate', 'Tax Certificate'), ('id_card', 'National ID Card'), ('other', 'Other')], max_length=30, verbose_name='document type')),
                ('file', models.FileField(upload_to='rental_companies/documents/', verbose_name='file')),
                ('name', models.CharField(max_length=200, verbose_name='name')),
                ('expiry_date', models.DateField(blank=True, null=True, verbose_name='expiry date')),
                ('verification_status', models.CharField(choices=[('pending', 'Pending'), ('verified', 'Verified'), ('rejected', 'Rejected')], default='pending', max_length=20, verbose_name='verification status')),
                ('rejection_reason', models.TextField(blank=True, verbose_name='rejection reason')),
                ('verified_at', models.DateTimeField(blank=True, null=True, verbose_name='verified at')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='uploaded at')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='rental_companies.rentalcompany')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'company document',
                'verbose_name_plural': 'company documents',
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.CreateModel(
            name='CompanyPayout',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_start', models.DateField(verbose_name='period start')),
                ('period_end', models.DateField(verbose_name='period end')),
                ('total_bookings', models.PositiveIntegerField(default=0, verbose_name='total bookings')),
                ('gross_amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='gross amount')),
                ('commission_amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='commission amount')),
                ('net_amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='net amount')),
                ('currency', models.CharField(default='MAD', max_length=3, verbose_name='currency')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20, verbose_name='status')),
                ('payment_method', models.CharField(blank=True, max_length=50, verbose_name='payment method')),
                ('payment_reference', models.CharField(blank=True, max_length=100, verbose_name='payment reference')),
                ('paid_at', models.DateTimeField(blank=True, null=True, verbose_name='paid at')),
                ('notes', models.TextField(blank=True, verbose_name='notes')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payouts', to='rental_companies.rentalcompany')),
            ],
            options={
                'verbose_name': 'company payout',
                'verbose_name_plural': 'company payouts',
                'ordering': ['-period_end'],
            },
        ),
    ]
