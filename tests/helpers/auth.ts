import { Page, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@transfers.ma';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'testpass123';
const WP_ADMIN_USER = process.env.WP_ADMIN_USER || 'admin';
const WP_ADMIN_PASS = process.env.WP_ADMIN_PASS || 'GjhYKq$T9MiuV)3n';

export async function dashboardLogin(page: Page) {
  await page.goto('https://' + (process.env.API_BASE_URL || 'api.transfers.ma').replace(/^https?:\/\//, '') + '/dashboard/login/');
  await page.waitForSelector('input[name="email"]', { timeout: 15_000 });
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL('**/dashboard/**', { timeout: 15_000 }),
    page.click('button[type="submit"]'),
  ]);
  expect(page.url()).toContain('/dashboard/');
  expect(page.url()).not.toContain('/login');
}

export async function wpAdminLogin(page: Page) {
  await page.goto('https://' + (process.env.WP_BASE_URL || 'transfers.ma').replace(/^https?:\/\//, '') + '/wp-login.php');
  await page.waitForSelector('#user_login', { timeout: 15_000 });
  await page.fill('#user_login', WP_ADMIN_USER);
  await page.fill('#user_pass', WP_ADMIN_PASS);
  await Promise.all([
    page.waitForURL('**/wp-admin/**', { timeout: 15_000 }),
    page.click('#wp-submit'),
  ]);
  // Dismiss "confirm admin email" notice if present
  const confirmBtn = page.locator('a.button[href*="admin_email_remind_later"]');
  if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  expect(page.url()).toContain('/wp-admin/');
}
