import logging
from celery import shared_task
from django.conf import settings

from .emails import send_templated_email

logger = logging.getLogger(__name__)


@shared_task
def send_booking_confirmation(booking_ref, customer_email, customer_name, booking_details):
    """Send booking confirmation email to the customer."""
    try:
        send_templated_email(
            subject=f"Booking Confirmation - {booking_ref}",
            template_name='emails/booking_confirmation.html',
            context={
                'booking_ref': booking_ref,
                'customer_name': customer_name,
                'details': booking_details,
            },
            to_emails=[customer_email],
        )
    except Exception:
        logger.exception('Failed to send booking confirmation for %s', booking_ref)


@shared_task
def send_payment_receipt(payment_ref, customer_email, customer_name, payment_details):
    """Send payment receipt email to the customer."""
    try:
        send_templated_email(
            subject=f"Payment Receipt - {payment_ref}",
            template_name='emails/payment_receipt.html',
            context={
                'payment_ref': payment_ref,
                'customer_name': customer_name,
                'details': payment_details,
            },
            to_emails=[customer_email],
        )
    except Exception:
        logger.exception('Failed to send payment receipt for %s', payment_ref)


@shared_task
def send_status_update(booking_ref, customer_email, customer_name, new_status):
    """Send booking status update email to the customer."""
    try:
        send_templated_email(
            subject=f"Booking Update - {booking_ref}",
            template_name='emails/status_update.html',
            context={
                'booking_ref': booking_ref,
                'customer_name': customer_name,
                'new_status': new_status,
            },
            to_emails=[customer_email],
        )
    except Exception:
        logger.exception('Failed to send status update for %s', booking_ref)


@shared_task
def send_admin_new_booking_alert(booking_ref, booking_type, customer_name, total_price):
    """Send new booking alert to admin."""
    admin_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
    if not admin_email:
        return

    try:
        send_templated_email(
            subject=f"New Booking - {booking_ref}",
            template_name='emails/booking_confirmation.html',
            context={
                'booking_ref': booking_ref,
                'customer_name': customer_name,
                'details': {
                    'booking_type': booking_type,
                    'total_price': total_price,
                },
                'is_admin_alert': True,
            },
            to_emails=[admin_email],
        )
    except Exception:
        logger.exception('Failed to send admin alert for %s', booking_ref)


# ---------------------------------------------------------------------------
# Rental Car Marketplace Tasks
# ---------------------------------------------------------------------------


@shared_task
def send_company_registration_received(company_id):
    """Send welcome email to newly registered company."""
    try:
        from apps.rental_companies.models import RentalCompany
        company = RentalCompany.objects.get(id=company_id)
        send_templated_email(
            subject="Welcome to Transfers.ma — Application Received",
            template_name='emails/company_registration_received.html',
            context={
                'company_name': company.company_name,
                'first_name': company.owner.first_name,
            },
            to_emails=[company.email],
        )
    except Exception:
        logger.exception('Failed to send registration received email for company %s', company_id)


@shared_task
def send_company_approved(company_id):
    """Notify company their application is approved."""
    try:
        from apps.rental_companies.models import RentalCompany
        company = RentalCompany.objects.get(id=company_id)
        portal_url = f"{getattr(settings, 'SITE_URL', '')}/company-portal/"
        send_templated_email(
            subject="Congratulations! Your company is approved",
            template_name='emails/company_approved.html',
            context={
                'company_name': company.company_name,
                'portal_url': portal_url,
            },
            to_emails=[company.email],
        )
    except Exception:
        logger.exception('Failed to send approval email for company %s', company_id)


@shared_task
def send_company_rejected(company_id, reason):
    """Notify company their application was rejected."""
    try:
        from apps.rental_companies.models import RentalCompany
        company = RentalCompany.objects.get(id=company_id)
        send_templated_email(
            subject="Application Update — Transfers.ma",
            template_name='emails/company_rejected.html',
            context={
                'company_name': company.company_name,
                'reason': reason,
            },
            to_emails=[company.email],
        )
    except Exception:
        logger.exception('Failed to send rejection email for company %s', company_id)


@shared_task
def send_company_new_booking(rental_id):
    """Notify company of a new rental booking."""
    try:
        from apps.rentals.models import Rental
        rental = Rental.objects.select_related('company', 'vehicle').get(id=rental_id)
        if not rental.company:
            return
        portal_url = f"{getattr(settings, 'SITE_URL', '')}/company-portal/bookings/{rental.booking_ref}/"
        send_templated_email(
            subject=f"New Booking: {rental.booking_ref}",
            template_name='emails/company_new_booking.html',
            context={
                'booking_ref': rental.booking_ref,
                'customer_name': rental.customer_name,
                'vehicle_name': rental.vehicle.name if rental.vehicle else 'N/A',
                'pickup_date': rental.pickup_date,
                'return_date': rental.return_date,
                'total_price': rental.total_price,
                'currency': rental.currency,
                'company_payout_amount': rental.company_payout_amount,
                'portal_url': portal_url,
            },
            to_emails=[rental.company.email],
        )
    except Exception:
        logger.exception('Failed to send new booking email for rental %s', rental_id)


@shared_task
def send_company_booking_cancelled(rental_id):
    """Notify company of cancelled booking."""
    try:
        from apps.rentals.models import Rental
        rental = Rental.objects.select_related('company').get(id=rental_id)
        if not rental.company:
            return
        send_templated_email(
            subject=f"Booking Cancelled: {rental.booking_ref}",
            template_name='emails/company_booking_cancelled.html',
            context={
                'booking_ref': rental.booking_ref,
                'customer_name': rental.customer_name,
                'cancellation_reason': rental.cancellation_reason,
                'company_name': rental.company.company_name,
            },
            to_emails=[rental.company.email],
        )
    except Exception:
        logger.exception('Failed to send cancellation email for rental %s', rental_id)


@shared_task
def send_rental_booking_confirmed(rental_id):
    """Send booking confirmation to customer."""
    try:
        from apps.rentals.models import Rental
        rental = Rental.objects.select_related('company', 'vehicle').get(id=rental_id)
        send_templated_email(
            subject=f"Car Rental Confirmed — {rental.booking_ref}",
            template_name='emails/rental_booking_confirmed.html',
            context={
                'booking_ref': rental.booking_ref,
                'vehicle_name': rental.vehicle.name if rental.vehicle else 'N/A',
                'company_name': rental.company.company_name if rental.company else 'N/A',
                'company_phone': rental.company.phone if rental.company else '',
                'company_whatsapp': rental.company.whatsapp if rental.company else '',
                'pickup_date': rental.pickup_date,
                'return_date': rental.return_date,
                'pickup_location': rental.pickup_location,
                'dropoff_location': rental.dropoff_location,
                'daily_rate': rental.daily_rate,
                'total_days': rental.total_days,
                'vehicle_total': rental.vehicle_total,
                'extras_total': rental.extras_total,
                'insurance_total': rental.insurance_total,
                'delivery_fee': rental.delivery_fee,
                'total_price': rental.total_price,
                'deposit_amount': rental.deposit_amount,
                'currency': rental.currency,
            },
            to_emails=[rental.customer_email],
        )
    except Exception:
        logger.exception('Failed to send rental confirmation for rental %s', rental_id)


@shared_task
def send_admin_new_company_registration(company_id):
    """Alert admin about new company registration."""
    try:
        from apps.rental_companies.models import RentalCompany
        from apps.accounts.models import SiteSettings
        company = RentalCompany.objects.get(id=company_id)
        site_settings = SiteSettings.get_settings()
        admin_email = site_settings.contact_email or getattr(settings, 'DEFAULT_FROM_EMAIL', '')
        if not admin_email:
            return
        dashboard_url = f"{getattr(settings, 'SITE_URL', '')}/dashboard/rental-companies/{company.pk}/"
        send_templated_email(
            subject=f"New Rental Company Registration: {company.company_name}",
            template_name='emails/admin_new_company_registration.html',
            context={
                'company_name': company.company_name,
                'city': company.city,
                'owner_email': company.owner.email,
                'owner_name': company.owner.full_name,
                'dashboard_url': dashboard_url,
            },
            to_emails=[admin_email],
        )
    except Exception:
        logger.exception('Failed to send admin alert for new company %s', company_id)
