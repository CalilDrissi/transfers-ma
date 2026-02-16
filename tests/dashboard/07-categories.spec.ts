import { test, expect } from '@playwright/test';
import { checkPageLoadedOk } from '../helpers/checks';

test.describe('Dashboard Vehicle Categories', () => {
  test('categories list loads', async ({ page }) => {
    await page.goto('/dashboard/vehicle-categories/');
    await checkPageLoadedOk(page, 'Categories list');
    // Categories use card layout
    const cards = page.locator('.card');
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('category detail shows custom fields', async ({ page }) => {
    await page.goto('/dashboard/vehicle-categories/');
    // The <a> wraps the .card div, with class text-decoration-none
    // Use that class to distinguish from sidebar nav link
    const detailLink = page.locator('a.text-decoration-none[href*="/vehicle-categories/"]').first();
    if (!(await detailLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No category detail links found');
      return;
    }
    await detailLink.click();
    await page.waitForLoadState('networkidle');
    await checkPageLoadedOk(page, 'Category detail');
    expect(page.url()).toMatch(/\/dashboard\/vehicle-categories\/\d+/);

    await expect(page.locator('input[name="tagline"]')).toBeVisible();
    await expect(page.locator('#catAmenitiesInput')).toBeAttached();
    await expect(page.locator('#catNotIncludedInput')).toBeAttached();
  });

  test('can update tagline', async ({ page }) => {
    await page.goto('/dashboard/vehicle-categories/');
    const link = page.locator('a.text-decoration-none[href*="/vehicle-categories/"]').first();
    if (!(await link.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No categories exist');
      return;
    }
    await link.click();
    await page.waitForLoadState('networkidle');

    const tagline = page.locator('input[name="tagline"]');
    if (!(await tagline.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Tagline field not found');
      return;
    }
    const original = await tagline.inputValue();
    await tagline.fill('Playwright tagline test');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(await tagline.inputValue()).toBe('Playwright tagline test');

    // Clean up
    await tagline.fill(original || '');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });
});
