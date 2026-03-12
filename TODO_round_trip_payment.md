# Round Trip Payment Bug — Fix Plan

## Problem
Round trip bookings charge the client for only ONE leg instead of both.
The return transfer stays "pending" forever even after payment.

## Root Cause
- Frontend displays correct 2x price (quote endpoint + JS both multiply)
- But `Transfer.calculate_total()` does NOT account for round trip
- Outbound `total_price` = one leg only (e.g. 100 instead of 200)
- Payment uses `booking.total_price` = one leg amount
- Payment confirmation only updates outbound transfer status, not return

## Current Flow (Broken)
```
Quote endpoint:     200 MAD (correct — applies x2 multiplier)
Frontend display:   200 MAD (correct — applies x2)
Transfer created:   total_price = 100 MAD (BUG — no multiplier)
Payment charged:    100 MAD (uses booking.total_price)
Return transfer:    stays "pending" forever (never updated)
```

## Fix 1: Correct total_price on outbound transfer (apps/transfers/api/serializers.py)
- In `TransferCreateSerializer.create()` (~line 233), after calculating total:
  - If `is_round_trip`, set outbound `total_price = (base_price + extras_price) * 2`
  - Return transfer keeps its own single-leg `total_price` (for display/records)
  - The outbound transfer is the one linked to Payment, so it must hold the full amount

## Fix 2: Update return transfer status on payment confirmation (apps/payments/api/views.py)
- In `_update_booking_status()` (~line 198), after updating outbound:
  ```python
  if booking.return_transfer:
      booking.return_transfer.status = new_status
      booking.return_transfer.save()
  ```
- Apply same logic for cancellations/refunds

## Fix 3: Deposit calculation (apps/payments/api/views.py)
- Verify deposit_amount is calculated from the correct (2x) total
- Check `deposit_percentage` logic uses the full round trip amount

## Files to change
- `apps/transfers/api/serializers.py` — multiply total_price for round trips
- `apps/transfers/models.py` — optionally update `calculate_total()` to respect `is_round_trip`
- `apps/payments/api/views.py` — update return transfer status + verify deposit calc

## Testing
- Create a round trip booking and verify payment amount = 2x base price
- Verify both outbound and return transfers show "confirmed" after payment
- Verify deposit mode charges correct percentage of full round trip amount
- Verify cancellation/refund handles both legs
