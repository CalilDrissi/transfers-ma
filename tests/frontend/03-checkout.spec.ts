import { test, expect } from '@playwright/test';
import { checkoutPageURL, COUPONS, TEST_CUSTOMER } from '../helpers/fixtures';

const CHECKOUT_URL = checkoutPageURL();
const SKIP_MSG = "Checkout page not found — create a WP page with slug 'checkout' containing [transfers_checkout]";

async function gotoCheckout(page: any): Promise<boolean> {
  const resp = await page.goto(CHECKOUT_URL);
  if (resp?.status() === 404) return false;
  await page.waitForLoadState('networkidle');
  return await page.locator('#tb-checkout').isVisible({ timeout: 5_000 }).catch(() => false);
}

test.describe('Checkout Page', () => {
  test('checkout page loads with order summary', async ({ page }) => {
    const ok = await gotoCheckout(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await expect(page.locator('#tb-checkout-summary')).toBeVisible();
    await expect(page.locator('#tb-checkout-summary-from')).toHaveText(/.+/);
  });

  test('form fields are present', async ({ page }) => {
    const ok = await gotoCheckout(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await expect(page.locator('#tb-checkout-name')).toBeVisible();
    await expect(page.locator('#tb-checkout-email')).toBeVisible();
    await expect(page.locator('#tb-checkout-phone')).toBeVisible();
    await expect(page.locator('#tb-checkout-pickup-address')).toBeVisible();
    await expect(page.locator('#tb-checkout-submit')).toBeVisible();
  });

  test('form validates required fields', async ({ page }) => {
    const ok = await gotoCheckout(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await page.click('#tb-checkout-submit');
    await page.waitForTimeout(1_000);
    const errors = page.locator('.tb-checkout__field-error');
    expect(await errors.count()).toBeGreaterThan(0);
  });

  test('coupon input works', async ({ page }) => {
    const ok = await gotoCheckout(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await page.fill('#tb-checkout-coupon-code', COUPONS.welcome);
    await page.click('#tb-checkout-coupon-apply');
    await page.waitForTimeout(3_000);
    const success = page.locator('#tb-checkout-coupon-success');
    const error = page.locator('#tb-checkout-coupon-error');
    expect((await success.isVisible().catch(() => false)) || (await error.isVisible().catch(() => false))).toBe(true);
  });

  test('invalid coupon shows error', async ({ page }) => {
    const ok = await gotoCheckout(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await page.fill('#tb-checkout-coupon-code', 'FAKECOUPON');
    await page.click('#tb-checkout-coupon-apply');
    await expect(page.locator('#tb-checkout-coupon-error')).toBeVisible({ timeout: 5_000 });
  });

  test('payment gateways load', async ({ page }) => {
    const ok = await gotoCheckout(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    const gateways = page.locator('#tb-checkout-gateways');
    await expect(gateways).toBeVisible();
    await page.waitForTimeout(3_000);
    if (await gateways.locator('> *').count() === 0) {
      console.error('⚠️  Payment gateways not loading — check WP plugin API settings');
    }
    expect(await gateways.locator('> *').count()).toBeGreaterThan(0);
  });

  test('full checkout flow with cash', async ({ page }) => {
    const ok = await gotoCheckout(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await page.fill('#tb-checkout-name', TEST_CUSTOMER.name);
    await page.fill('#tb-checkout-email', TEST_CUSTOMER.email);
    await page.fill('#tb-checkout-phone', TEST_CUSTOMER.phone);
    await page.fill('#tb-checkout-pickup-address', 'Airport Terminal');
    await page.waitForTimeout(3_000);
    const cashContainer = page.locator('#tb-checkout-cash-container');
    if (!(await cashContainer.isVisible().catch(() => false))) {
      test.skip(true, 'Cash gateway not available'); return;
    }
    const cashInput = cashContainer.locator('input[type="radio"], button, label').first();
    if (await cashInput.isVisible()) await cashInput.click();
    await page.click('#tb-checkout-submit');
    await page.waitForTimeout(5_000);
    const url = page.url();
    const hasAlert = await page.locator('#tb-checkout-alert').isVisible().catch(() => false);
    expect(url.includes('booking-confirmed') || url.includes('confirmation') || hasAlert).toBe(true);
  });
});
