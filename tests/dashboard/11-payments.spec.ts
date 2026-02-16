import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Payments', () => {
  test('payments list loads', async ({ page }) => {
    await page.goto('/dashboard/payments/');
    await checkPageLoadedOk(page, 'Payments list');
  });
});
