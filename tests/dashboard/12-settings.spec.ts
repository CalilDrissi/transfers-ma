import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/');
    await checkPageLoadedOk(page, 'Settings');
    await expect(page.locator('form').first()).toBeVisible();
  });

  test('PayPal settings fields exist', async ({ page }) => {
    await page.goto('/dashboard/settings/');
    await checkPageLoadedOk(page, 'Settings PayPal');
    await expect(page.locator('#paypal_client_id')).toBeVisible();
    await expect(page.locator('#paypal_client_secret')).toBeVisible();
    await expect(page.locator('#paypal_mode')).toBeVisible();
  });

  test('Stripe settings fields exist', async ({ page }) => {
    await page.goto('/dashboard/settings/');
    await expect(page.locator('#stripe_publishable_key')).toBeVisible();
    await expect(page.locator('#stripe_secret_key')).toBeVisible();
  });
});
