from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_templated_email(subject, template_name, context, to_emails):
    """Send an HTML email using a Django template."""
    context.setdefault('site_name', getattr(settings, 'SITE_NAME', 'Transfers.ma'))
    context.setdefault('site_url', getattr(settings, 'SITE_URL', ''))

    html_body = render_to_string(template_name, context)
    from_email = settings.DEFAULT_FROM_EMAIL

    msg = EmailMultiAlternatives(subject, '', from_email, to_emails)
    msg.attach_alternative(html_body, 'text/html')
    msg.send(fail_silently=True)
