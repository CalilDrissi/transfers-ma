from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib import messages
from django.utils.text import slugify
from apps.accounts.models import User
from .models import RentalCompany, CompanyDocument


def register(request):
    if request.method == 'POST':
        # Account info
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        phone = request.POST.get('phone', '').strip()

        # Validation
        if User.objects.filter(email=email).exists():
            messages.error(request, 'An account with this email already exists.')
            return render(request, 'rental_companies/register.html')

        if len(password) < 8:
            messages.error(request, 'Password must be at least 8 characters.')
            return render(request, 'rental_companies/register.html')

        # Create user
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role='rental_company',
        )

        # Company info
        company_name = request.POST.get('company_name', '').strip()
        slug = slugify(company_name)
        base_slug = slug
        counter = 1
        while RentalCompany.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        company = RentalCompany.objects.create(
            owner=user,
            company_name=company_name,
            slug=slug,
            email=request.POST.get('company_email', email),
            phone=request.POST.get('company_phone', phone),
            city=request.POST.get('city', ''),
            address=request.POST.get('address', ''),
            ice_number=request.POST.get('ice_number', ''),
            rc_number=request.POST.get('rc_number', ''),
            license_number=request.POST.get('license_number', ''),
            tax_id=request.POST.get('tax_id', ''),
            pickup_cities=[request.POST.get('city', '')] if request.POST.get('city') else [],
            status='pending',
        )

        # Handle document upload
        if request.FILES.get('document'):
            CompanyDocument.objects.create(
                company=company,
                document_type=request.POST.get('document_type', 'other'),
                file=request.FILES['document'],
                name=request.POST.get('document_name', 'Document'),
            )

        # Send notification emails (best effort)
        try:
            from apps.notifications.tasks import send_company_registration_received, send_admin_new_company_registration
            send_company_registration_received.delay(company.id)
            send_admin_new_company_registration.delay(company.id)
        except Exception:
            pass

        login(request, user)
        messages.success(request, 'Registration successful! Your application is under review.')
        return redirect('portal:home')

    return render(request, 'rental_companies/register.html')
