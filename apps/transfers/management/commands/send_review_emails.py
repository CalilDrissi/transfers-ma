import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send Trustpilot review request emails for completed transfers'

    def handle(self, *args, **options):
        from apps.transfers.models import Transfer
        from apps.notifications.emails import send_templated_email

        now = timezone.now()
        window_start = now - timedelta(hours=6)
        window_end = now - timedelta(hours=3)

        transfers = Transfer.objects.filter(
            pickup_datetime__gte=window_start,
            pickup_datetime__lte=window_end,
            review_email_sent=False,
            customer_email__isnull=False,
        ).exclude(
            status__in=['cancelled', 'no_show']
        ).exclude(
            customer_email=''
        )

        sent = 0
        for transfer in transfers:
            try:
                send_templated_email(
                    subject='Thank you for travelling with Transfers.ma – We’d love your feedback! ⭐',
                    template_name='emails/review_request.html',
                    context={'customer_name': transfer.customer_name},
                    to_emails=[transfer.customer_email],
                )
                transfer.review_email_sent = True
                transfer.save(update_fields=['review_email_sent'])
                sent += 1
                logger.info('Review email sent for transfer %s', transfer.booking_ref)
            except Exception:
                logger.exception('Failed to send review email for transfer %s', transfer.booking_ref)

        self.stdout.write(self.style.SUCCESS(f'Sent {sent} review email(s).'))
