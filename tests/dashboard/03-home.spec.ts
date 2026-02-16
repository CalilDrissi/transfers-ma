import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Home', () => {
  test('home page shows stat cards', async ({ page }) => {
    await page.goto('/dashboard/');
    await checkPageLoadedOk(page, 'Home');
    const cards = page.locator('.card');
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
  });

  test('stats show numbers not errors', async ({ page }) => {
    await page.goto('/dashboard/');
    await checkPageLoadedOk(page, 'Home stats');
    const content = await page.textContent('body');
    expect(content).not.toContain('Traceback');
    expect(content).not.toContain('OperationalError');
  });
});
