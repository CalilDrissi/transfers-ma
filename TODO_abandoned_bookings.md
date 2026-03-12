# Abandoned Booking Emails — Implementation Plan

## Overview
Send emails when a customer starts a booking but doesn't complete payment.
Two emails: one to customer (recovery nudge), one to admin (awareness alert).
Delay is configurable by admin via dashboard settings.

## 1. New EmailTemplate types (apps/notifications/models.py)
- `booking_pending_customer` / `booking_pending_admin`
- `zone_pending_customer` / `zone_pending_admin`
- `route_pending_customer` / `route_pending_admin`
- Update `CATEGORY_CHOICES`, `DEFAULTS`, `EmailType` choices
- Migration for new choices

## 2. Abandoned booking delay setting (apps/accounts/models.py)
- Add `abandoned_booking_delay_minutes = IntegerField(default=30)` to SiteSettings
- Expose in dashboard settings page
- Migration

## 3. New Transfer model field (apps/transfers/models.py)
- Add `pending_email_sent = BooleanField(default=False)`
- Prevents duplicate emails
- Migration

## 4. New email HTML templates
- `templates/emails/pending_booking_customer.html` — recovery email with booking details + CTA to rebook
- `templates/emails/pending_booking_admin.html` — alert with customer info + booking details
- Both respect `show_*` toggles and include custom fields

## 5. New Celery tasks (apps/notifications/tasks.py)
- `send_pending_booking_customer(booking_ref, customer_email, customer_name, booking_details)`
- `send_pending_booking_admin(booking_ref, customer_name, customer_email, customer_phone, booking_details)`
- `check_abandoned_bookings()` — periodic task:
  - Reads delay from SiteSettings
  - Queries `Transfer.objects.filter(status='pending', created_at__lte=now-delay, pending_email_sent=False)`
  - Builds booking_details (with custom fields)
  - Dispatches both email tasks
  - Sets `pending_email_sent=True`

## 6. Celery beat schedule (config/celery.py)
- `check-abandoned-bookings` runs every 10 minutes via crontab
- Only acts on bookings older than admin-configured delay

## 7. Dashboard email template tabs
- Add "Pending Customer" and "Pending Admin" tabs within each category:
  - Bookings: Customer | Admin | Supplier | Pending Customer | Pending Admin
  - Zones: Customer | Admin | Supplier | Pending Customer | Pending Admin
  - Routes: Customer | Admin | Supplier | Pending Customer | Pending Admin
- Same editing form: subject, heading, intro/closing text, show/hide toggles, CC, active toggle

## 8. Dashboard settings UI
- Add `abandoned_booking_delay_minutes` input to site settings form
- Label: "Send abandoned booking email after (minutes)"

## Files to change
- `apps/notifications/models.py`
- `apps/notifications/tasks.py`
- `apps/transfers/models.py`
- `apps/accounts/models.py`
- `templates/emails/pending_booking_customer.html` (new)
- `templates/emails/pending_booking_admin.html` (new)
- `templates/dashboard/email_templates/` (update tabs)
- `apps/dashboard/views.py`
- `config/celery.py`
- 2 migrations (transfers + accounts)

## No changes needed
- Existing booking creation flow
- Existing payment confirmation flow
- WordPress plugin
