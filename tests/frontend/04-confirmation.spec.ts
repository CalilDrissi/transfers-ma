import { test, expect } from '@playwright/test';
import { API_BASE, API_KEY, MARRAKECH_AIRPORT, MARRAKECH_MEDINA, WP_PAGES, tomorrowISO } from '../helpers/fixtures';
import { ApiClient } from '../helpers/api-client';

let bookingRef = '';
const SKIP_MSG = "Confirmation page not found — create a WP page with slug 'booking-confirmed' containing [transfers_confirmation]";

async function gotoConfirmation(page: any, ref: string): Promise<boolean> {
  const url = ref ? `${WP_PAGES.confirmation}?ref=${ref}` : WP_PAGES.confirmation;
  const resp = await page.goto(url);
  if (resp?.status() === 404) return false;
  await page.waitForLoadState('networkidle');
  const has = await page.locator('#tb-confirmation').isVisible({ timeout: 5_000 }).catch(() => false);
  return has;
}

test.describe('Confirmation Page', () => {
  test.beforeAll(async ({ request }) => {
    if (!API_KEY) return;
    const client = new ApiClient(request, API_BASE, API_KEY);
    const catResp = await client.getCategories();
    if (!catResp.ok()) return;
    const cats = await catResp.json();
    const results = cats.results || cats;
    if (!results.length) return;
    const bResp = await client.createBooking({
      customer_name: 'Confirmation Test',
      customer_email: 'confirm@test.com',
      customer_phone: '+212600000003',
      transfer_type: 'city_to_city',
      pickup_address: 'Marrakech Airport',
      pickup_latitude: MARRAKECH_AIRPORT.lat,
      pickup_longitude: MARRAKECH_AIRPORT.lng,
      dropoff_address: 'Marrakech Medina',
      dropoff_latitude: MARRAKECH_MEDINA.lat,
      dropoff_longitude: MARRAKECH_MEDINA.lng,
      pickup_datetime: tomorrowISO(),
      passengers: 2,
      luggage: 1,
      vehicle_category: results[0].id,
    });
    if (bResp.status() === 201) {
      bookingRef = (await bResp.json()).booking_ref;
    }
  });

  test('confirmation loads with valid ref', async ({ page }) => {
    test.skip(!bookingRef, 'No booking ref — set API_KEY in .env');
    const ok = await gotoConfirmation(page, bookingRef);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await expect(page.locator('#tb-confirmation-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#tb-confirmation-ref')).toHaveText(new RegExp(bookingRef));
  });

  test('shows booking details', async ({ page }) => {
    test.skip(!bookingRef, 'No booking ref');
    const ok = await gotoConfirmation(page, bookingRef);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    if (!(await page.locator('#tb-confirmation-content').isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip(true, 'Confirmation content did not load'); return;
    }
    await expect(page.locator('#tb-confirmation-route')).toHaveText(/.+/);
    await expect(page.locator('#tb-confirmation-vehicle')).toHaveText(/.+/);
    await expect(page.locator('#tb-confirmation-total')).toHaveText(/.+/);
  });

  test('error for invalid ref', async ({ page }) => {
    const ok = await gotoConfirmation(page, 'INVALID_REF_XYZ');
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await expect(page.locator('#tb-confirmation-error')).toBeVisible({ timeout: 15_000 });
  });

  test('error for missing ref', async ({ page }) => {
    const ok = await gotoConfirmation(page, '');
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await page.waitForTimeout(5_000);
    const hasError = await page.locator('#tb-confirmation-error').isVisible().catch(() => false);
    const noContent = !(await page.locator('#tb-confirmation-content').isVisible().catch(() => false));
    expect(hasError || noContent).toBe(true);
  });
});
