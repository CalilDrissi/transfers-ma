import { test, expect } from '@playwright/test';
import { dashboardLogin } from '../helpers/auth';
import { checkForErrors } from '../helpers/checks';

// Fresh browser — no storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Dashboard Login', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/dashboard/login/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/dashboard/login/');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'bad@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
  });

  test('successful login redirects to home', async ({ page }) => {
    await dashboardLogin(page);
    await checkForErrors(page);
    expect(page.url()).toContain('/dashboard/');
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('nav#sidebar')).toBeVisible();
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/dashboard/routes/');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('logout works', async ({ page }) => {
    await dashboardLogin(page);
    await page.goto('/dashboard/logout/');
    await page.waitForTimeout(2000);
    // Try accessing a protected page
    await page.goto('/dashboard/routes/');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });
});
