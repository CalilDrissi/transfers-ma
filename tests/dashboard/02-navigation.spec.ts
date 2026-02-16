import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Navigation', () => {
  test('sidebar contains all navigation links', async ({ page }) => {
    await page.goto('/dashboard/');
    const sidebar = page.locator('nav#sidebar');
    await expect(sidebar).toBeVisible();
    const text = (await sidebar.textContent()) || '';
    const expected = [
      'Dashboard', 'Transfers', 'Transfer Vehicles', 'Vehicle Categories',
      'Zones', 'Routes', 'Tours', 'Users', 'Payments', 'Coupons',
      'Reports', 'Settings', 'API Keys',
    ];
    for (const link of expected) {
      expect(text.toLowerCase(), `Sidebar missing "${link}"`).toContain(link.toLowerCase());
    }
  });

  test('every dashboard page loads without 500', async ({ page }) => {
    const pages = [
      { path: '/dashboard/', name: 'Home' },
      { path: '/dashboard/transfers/', name: 'Transfers' },
      { path: '/dashboard/transfer-vehicles/', name: 'Vehicles' },
      { path: '/dashboard/vehicle-categories/', name: 'Categories' },
      { path: '/dashboard/zones/', name: 'Zones' },
      { path: '/dashboard/routes/', name: 'Routes' },
      { path: '/dashboard/trips/', name: 'Trips' },
      { path: '/dashboard/users/', name: 'Users' },
      { path: '/dashboard/payments/', name: 'Payments' },
      { path: '/dashboard/coupons/', name: 'Coupons' },
      { path: '/dashboard/reports/', name: 'Reports' },
      { path: '/dashboard/settings/', name: 'Settings' },
      { path: '/dashboard/api-keys/', name: 'API Keys' },
    ];
    for (const p of pages) {
      const resp = await page.goto(p.path);
      expect(resp?.status(), `${p.name} returned ${resp?.status()}`).toBe(200);
      await checkPageLoadedOk(page, p.name);
      await expect(page.locator('nav#sidebar')).toBeVisible();
    }
  });
});
