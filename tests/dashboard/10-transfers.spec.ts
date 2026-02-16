import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Transfers', () => {
  test('transfers list loads', async ({ page }) => {
    await page.goto('/dashboard/transfers/');
    await checkPageLoadedOk(page, 'Transfers list');
  });

  test('transfer detail loads', async ({ page }) => {
    await page.goto('/dashboard/transfers/');
    const firstLink = page.locator('table tbody tr a').first();
    if (!(await firstLink.isVisible())) {
      test.skip(true, 'No transfers exist');
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await checkPageLoadedOk(page, 'Transfer detail');
    expect(page.url()).toMatch(/\/dashboard\/transfers\/\d+/);
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(100);
  });
});
