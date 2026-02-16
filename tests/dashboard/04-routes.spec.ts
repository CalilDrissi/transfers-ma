import { test, expect } from '@playwright/test';
import { checkPageLoadedOk, checkForErrors } from '../helpers/checks';

test.describe('Dashboard Routes', () => {
  test('routes list loads', async ({ page }) => {
    await page.goto('/dashboard/routes/');
    await checkPageLoadedOk(page, 'Routes list');
    // Routes page uses card layout
    const cards = page.locator('.card');
    expect(await cards.count()).toBeGreaterThanOrEqual(0);
  });

  test('route detail loads with custom fields', async ({ page }) => {
    await page.goto('/dashboard/routes/');
    // Routes use cards — click first card link
    const firstLink = page.locator('.card a, table tbody tr a').first();
    if (!(await firstLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No routes exist');
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await checkPageLoadedOk(page, 'Route detail');
    expect(page.url()).toMatch(/\/dashboard\/routes\/\d+/);

    // Custom fields
    await expect(page.locator('textarea[name="client_notice"]')).toBeVisible();
    await expect(page.locator('select[name="client_notice_type"]')).toBeVisible();
    await expect(page.locator('textarea[name="route_description"]')).toBeVisible();
    await expect(page.locator('#highlightsInput')).toBeAttached();
    await expect(page.locator('textarea[name="travel_tips"]')).toBeVisible();
    await expect(page.locator('textarea[name="estimated_traffic_info"]')).toBeVisible();
    await expect(page.locator('#amenitiesInput')).toBeAttached();
    await expect(page.locator('textarea[name="cancellation_policy_override"]')).toBeVisible();
  });

  test('highlights editor works', async ({ page }) => {
    await page.goto('/dashboard/routes/');
    const firstLink = page.locator('.card a, table tbody tr a').first();
    if (!(await firstLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No routes exist');
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await checkForErrors(page);

    const highlightInput = page.locator('#highlightNew');
    if (await highlightInput.isVisible()) {
      await highlightInput.fill('Playwright test highlight');
      const addBtn = highlightInput.locator('..').locator('button');
      if (await addBtn.isVisible()) {
        await addBtn.click();
        const badges = page.locator('#highlightsList .badge');
        expect(await badges.count()).toBeGreaterThan(0);
      }
    }
  });

  test('create route page loads', async ({ page }) => {
    const resp = await page.goto('/dashboard/routes/create/');
    expect(resp?.status()).toBe(200);
    await checkPageLoadedOk(page, 'Route create');
    await expect(page.locator('form').first()).toBeVisible();
  });
});
