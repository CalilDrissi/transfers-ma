import { test, expect } from '@playwright/test';
import { checkPageLoadedOk, checkForErrors } from '../helpers/checks';

test.describe('Dashboard Trips', () => {
  test('trips list loads', async ({ page }) => {
    await page.goto('/dashboard/trips/');
    await checkPageLoadedOk(page, 'Trips list');
  });

  test('trip create page loads', async ({ page }) => {
    const resp = await page.goto('/dashboard/trips/create/');
    expect(resp?.status()).toBe(200);
    await checkPageLoadedOk(page, 'Trip create');
    await expect(page.locator('form')).toBeVisible();
  });

  test('trip detail loads', async ({ page }) => {
    await page.goto('/dashboard/trips/');
    const firstLink = page.locator('table tbody tr a, .card a').first();
    if (!(await firstLink.isVisible())) {
      test.skip(true, 'No trips exist');
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await checkPageLoadedOk(page, 'Trip detail');
    expect(page.url()).toMatch(/\/dashboard\/trips\/\d+/);
  });

  test('trip preview works', async ({ page }) => {
    await page.goto('/dashboard/trips/');
    const firstLink = page.locator('table tbody tr a, .card a').first();
    if (!(await firstLink.isVisible())) {
      test.skip(true, 'No trips exist');
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');

    // Find preview link
    const previewLink = page.locator('a[href*="/preview"]').first();
    if (await previewLink.isVisible()) {
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        previewLink.click(),
      ]).catch(() => [null]);
      if (newPage) {
        await newPage.waitForLoadState('networkidle');
        await checkForErrors(newPage);
        await newPage.close();
      }
    }
  });

  test('trip bookings list loads', async ({ page }) => {
    const resp = await page.goto('/dashboard/trips/bookings/');
    expect(resp?.status()).toBe(200);
    await checkPageLoadedOk(page, 'Trip bookings');
  });
});
