# Reverted Fixes — To Re-implement Later

## 1. Google Places Address Fix
- Prepend `place.name` to `formatted_address` so airports/landmarks show real names instead of postal codes
- File: `transfers-booking/public/js/tb-step1.js`
- Example: "Agadir Al Massira Airport, BP 2000, Agadir 80000" instead of just "BP 2000, Agadir 80000"

## 2. Custom Fields in Customer Email
- Add custom fields block to `templates/emails/booking_confirmation.html`
- Same block pattern as admin and supplier templates

## 3. Phone Country Code Dropdown Fix
- Convert from absolute-position dropdown to centered popup modal with backdrop
- Replace emoji flags with flagcdn.com CDN images (Windows compatibility)
- Add keyboard navigation (Arrow keys, Enter, Escape)
- Share single popup for phone + WhatsApp
- iOS Safari touch-action fixes
- Files: step-3.php, tb-step3.js, tb-booking.css, class-tb-shortcode.php

## 4. Round Trip Payment Fix
- Outbound transfer total_price should be multiplied by 2 for round trips
- Payment confirmation should update return transfer status too
- Files: apps/transfers/api/serializers.py, apps/payments/api/views.py

## 5. Multi-City Booking (see TODO_multi_city.md)
- UI exists but backend doesn't support it — legs silently discarded
- Hide tab or implement full backend support

## 6. Abandoned Booking Emails (see TODO_abandoned_bookings.md)
- Recovery emails for incomplete payments
- Celery periodic task + new email templates
