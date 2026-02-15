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
