from django.shortcuts import render
from django.http import Http404
from django.utils import timezone

from .models import SupplierConfirmation
from .emails import send_templated_email


def confirm_reception(request, token):
    try:
        confirmation = SupplierConfirmation.objects.get(token=token)
    except SupplierConfirmation.DoesNotExist:
        raise Http404

    already_confirmed = confirmation.is_confirmed

    if not already_confirmed:
        confirmation.confirmed_at = timezone.now()
        confirmation.save(update_fields=['confirmed_at'])
        _notify_admin_confirmed(confirmation)

    return render(request, 'notifications/confirm_reception.html', {
        'confirmation': confirmation,
        'already_confirmed': already_confirmed,
    })


def _notify_admin_confirmed(confirmation):
    try:
        send_templated_email(
            subject=f'Supplier confirmed reception — {confirmation.booking_ref}',
            template_name='notifications/admin_supplier_confirmed.html',
            context={'confirmation': confirmation},
            to_emails=['contact@transfers.ma'],
        )
    except Exception:
        pass
