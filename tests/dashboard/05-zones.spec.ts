import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Zones', () => {
  test('zones list loads', async ({ page }) => {
    await page.goto('/dashboard/zones/');
    await checkPageLoadedOk(page, 'Zones list');
  });

  test('zone detail shows custom fields', async ({ page }) => {
    await page.goto('/dashboard/zones/');
    const firstLink = page.locator('table tbody tr a').first();
    if (!(await firstLink.isVisible())) {
      test.skip(true, 'No zones exist');
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await checkPageLoadedOk(page, 'Zone detail');
    expect(page.url()).toMatch(/\/dashboard\/zones\/\d+/);

    await expect(page.locator('textarea[name="client_notice"]')).toBeVisible();
    await expect(page.locator('textarea[name="pickup_instructions"]')).toBeVisible();
    await expect(page.locator('textarea[name="area_description"]')).toBeVisible();
  });

  test('create zone page loads', async ({ page }) => {
    const resp = await page.goto('/dashboard/zones/create/');
    expect(resp?.status()).toBe(200);
    await checkPageLoadedOk(page, 'Zone create');
    await expect(page.locator('form')).toBeVisible();
  });
});
