from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


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
