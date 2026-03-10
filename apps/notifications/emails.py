import imaplib
import logging
from email.utils import formatdate

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _save_to_sent_folder(msg):
    """Append a copy of the sent message to the IMAP Sent folder."""
    try:
        host = getattr(settings, 'EMAIL_HOST', '')
        user = getattr(settings, 'EMAIL_HOST_USER', '')
        password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        if not all([host, user, password]):
            return

        use_ssl = getattr(settings, 'EMAIL_USE_SSL', False)
        if use_ssl:
            imap = imaplib.IMAP4_SSL(host)
        else:
            imap = imaplib.IMAP4(host)
            if getattr(settings, 'EMAIL_USE_TLS', True):
                imap.starttls()

        imap.login(user, password)
        raw = msg.message().as_bytes()
        imap.append('Sent', '\\Seen', None, raw)
        imap.logout()
    except Exception:
        logger.debug('Failed to save email to Sent folder', exc_info=True)


def send_templated_email(subject, template_name, context, to_emails, attachments=None):
    """Send an HTML email using a Django template.

    Args:
        attachments: optional list of (filename, content_bytes, mime_type) tuples.
    """
    context.setdefault('site_name', getattr(settings, 'SITE_NAME', 'Transfers.ma'))
    context.setdefault('site_url', getattr(settings, 'SITE_URL', ''))

    html_body = render_to_string(template_name, context)
    from_email = settings.DEFAULT_FROM_EMAIL

    msg = EmailMultiAlternatives(subject, '', from_email, to_emails)
    msg.attach_alternative(html_body, 'text/html')

    for attachment in (attachments or []):
        msg.attach(*attachment)

    msg.send(fail_silently=True)
    _save_to_sent_folder(msg)
