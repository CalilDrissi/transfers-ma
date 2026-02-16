import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Vehicles', () => {
  test('vehicles list loads', async ({ page }) => {
    await page.goto('/dashboard/transfer-vehicles/');
    await checkPageLoadedOk(page, 'Vehicles list');
    // Vehicles page may use table or card layout
    const table = page.locator('table');
    const cards = page.locator('.card');
    expect((await table.count()) + (await cards.count())).toBeGreaterThan(0);
  });

  test('vehicle detail shows custom fields', async ({ page }) => {
    await page.goto('/dashboard/transfer-vehicles/');
    const firstLink = page.locator('table tbody tr a, .card a').first();
    if (!(await firstLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No vehicles exist');
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await checkPageLoadedOk(page, 'Vehicle detail');
    expect(page.url()).toMatch(/\/dashboard\/transfer-vehicles\/\d+/);

    await expect(page.locator('textarea[name="client_description"]')).toBeVisible();
    await expect(page.locator('textarea[name="important_note"]')).toBeVisible();
    await expect(page.locator('select[name="important_note_type"]')).toBeVisible();
    await expect(page.locator('#keyFeaturesInput')).toBeAttached();
  });

  test('create vehicle page loads', async ({ page }) => {
    const resp = await page.goto('/dashboard/transfer-vehicles/create/');
    expect(resp?.status()).toBe(200);
    await checkPageLoadedOk(page, 'Vehicle create');
    await expect(page.locator('form').first()).toBeVisible();
  });
});
