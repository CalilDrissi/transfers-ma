# Multi-City Booking — Implementation Plan

## Current State
The multi-city UI exists in Step 1 (tab, add/remove legs, return-to-start toggle) but is **non-functional**. Only the first leg is ever priced, displayed in checkout, or submitted. All other legs are silently discarded.

## Immediate Fix (Short-term)
Hide or disable the "Multi-city" tab until backend support is ready. This prevents customers from thinking they booked multiple legs when only the first was created.

## Full Implementation

### 1. Backend: New model or linking mechanism
**Option A** — Group model:
- New `BookingGroup` model with FK to multiple `Transfer` objects
- `total_price` for entire itinerary
- Single `Payment` linked to group instead of individual transfer

**Option B** — Chain transfers (simpler):
- Add `group_id` (UUID) field to `Transfer` model
- All legs in a multi-city booking share the same `group_id`
- Payment linked to first transfer, amount = sum of all legs in group
- Status updates cascade to all transfers in group

### 2. Backend: New API endpoint
- `POST /api/v1/transfers/multi-city/` accepts array of legs:
  ```json
  {
    "customer_name": "...",
    "customer_email": "...",
    "legs": [
      { "pickup_address": "...", "dropoff_address": "...", "pickup_datetime": "...", ... },
      { "pickup_address": "...", "dropoff_address": "...", "pickup_datetime": "...", ... }
    ],
    "vehicle_category_id": 5,
    "passengers": 2,
    "extras": [...]
  }
  ```
- Creates one `Transfer` per leg, all linked by `group_id`
- Returns combined total price

### 3. Backend: Payment handling
- Payment amount = sum of all legs' `total_price`
- Payment confirmation updates ALL transfers in group to "confirmed"
- Cancellation/refund handles all legs together
- Deposit calculated from combined total

### 4. Backend: Email templates
- Confirmation email should list all legs, not just one
- Supplier emails: one per leg (different suppliers may handle different legs) or one combined

### 5. Frontend: Step 2 — Price all legs
- Loop through `state.legs[]` and call `getPricing()` for each
- Show per-leg price + combined total
- Vehicle selection applies to all legs (or per-leg if needed)
- Display all legs in the vehicle/pricing summary

### 6. Frontend: Step 3 — Checkout with all legs
- Summary sidebar shows all legs (pickup→dropoff, date, price for each)
- Combined total displayed
- Submission reads from `state.legs[]`, not flat state fields
- Single payment for entire itinerary

### 7. Frontend: API proxy
- Add `create_multi_city_booking` to allowed endpoints in `class-tb-api-proxy.php`

### 8. Dashboard
- Group linked transfers visually in admin booking list
- Show "Multi-city (3 legs)" badge or similar
- Editing one leg should show context of full itinerary

## Files to change
- `apps/transfers/models.py` — add `group_id` field + migration
- `apps/transfers/api/serializers.py` — new `MultiCityCreateSerializer`
- `apps/transfers/api/views.py` — new endpoint
- `apps/payments/api/views.py` — group-aware payment + status updates
- `transfers-booking/public/js/tb-step2.js` — multi-leg pricing loop
- `transfers-booking/public/js/tb-step3.js` — multi-leg checkout + submission
- `transfers-booking/public/js/tb-state.js` — ensure legs state flows to Step 2/3
- `transfers-booking/includes/class-tb-api-proxy.php` — whitelist new endpoint
- `templates/emails/booking_confirmation.html` — multi-leg layout
- `apps/dashboard/` — grouped display

## Quick Win (Do First)
Hide the multi-city tab to prevent broken bookings:
- In `step-1.php`: add `style="display:none"` to the multi-city tab button
- Or in `tb-step1.js`: skip multi-city mode initialization
