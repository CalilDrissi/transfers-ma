import io
import logging

from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def generate_receipt_pdf(context):
    """Generate a PDF receipt from booking data. Returns bytes or None on failure."""
    context.setdefault('site_name', getattr(settings, 'SITE_NAME', 'Transfers.ma'))
    context.setdefault('site_url', getattr(settings, 'SITE_URL', ''))

    try:
        from xhtml2pdf import pisa
    except ImportError:
        logger.warning('xhtml2pdf not installed — skipping PDF receipt generation')
        return None

    html_string = render_to_string('emails/receipt_pdf.html', context)
    buffer = io.BytesIO()
    result = pisa.CreatePDF(io.StringIO(html_string), dest=buffer)

    if result.err:
        logger.error('PDF generation failed: %s errors', result.err)
        return None

    return buffer.getvalue()
