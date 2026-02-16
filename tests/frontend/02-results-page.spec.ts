import { test, expect } from '@playwright/test';
import { MARRAKECH_AIRPORT, MARRAKECH_MEDINA, resultsPageURL } from '../helpers/fixtures';

const RESULTS_URL = resultsPageURL(MARRAKECH_AIRPORT, MARRAKECH_MEDINA);
const SKIP_MSG = "Results page not found — create a WP page with slug 'book-transfer' containing [transfers_results]";

async function gotoResults(page: any): Promise<boolean> {
  const resp = await page.goto(RESULTS_URL);
  if (resp?.status() === 404) return false;
  await page.waitForLoadState('networkidle');
  const hasWidget = await page.locator('#tb-results').isVisible({ timeout: 5_000 }).catch(() => false);
  return hasWidget;
}

test.describe('Results Page', () => {
  test('results page loads', async ({ page }) => {
    const ok = await gotoResults(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await expect(page.locator('#tb-results')).toBeVisible();
  });

  test('vehicle cards appear', async ({ page }) => {
    const ok = await gotoResults(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }

    const card = page.locator('.tb-results__vehicle-card').first();
    const visible = await card.isVisible({ timeout: 15_000 }).catch(() => false);
    if (!visible) {
      console.error('⚠️  WP plugin API proxy not configured — set API base URL and API key in plugin settings');
    }
    expect(visible, 'No vehicle cards loaded — check WP plugin API settings').toBe(true);
  });

  test('vehicle card has required info', async ({ page }) => {
    const ok = await gotoResults(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    const card = page.locator('.tb-results__vehicle-card').first();
    if (!(await card.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip(true, 'No vehicle cards loaded'); return;
    }
    await expect(card.locator('.tb-results__vehicle-category')).toHaveText(/.+/);
    await expect(card.locator('.tb-results__price-value')).toHaveText(/.+/);
    await expect(card.locator('.tb-results__spec-pax')).toHaveText(/.+/);
  });

  test('route summary shows distance/duration', async ({ page }) => {
    const ok = await gotoResults(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    const display = page.locator('#tb-results-route-display');
    if (await display.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const text = await display.textContent();
      expect(text).not.toBe('--');
    }
  });

  test('custom fields render', async ({ page }) => {
    const ok = await gotoResults(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    const card = page.locator('.tb-results__vehicle-card').first();
    if (!(await card.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip(true, 'No vehicle cards loaded'); return;
    }
    const tagline = card.locator('.tb-results__vehicle-tagline');
    if (await tagline.isVisible()) {
      expect((await tagline.textContent())!.length).toBeGreaterThan(0);
    }
  });

  test('Book Now redirects to checkout', async ({ page }) => {
    const ok = await gotoResults(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    const bookBtn = page.locator('.tb-results__book-btn').first();
    if (!(await bookBtn.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip(true, 'No book buttons loaded'); return;
    }
    await bookBtn.click();
    await page.waitForLoadState('networkidle');
    expect(page.url().includes('/checkout') || page.url().includes('category_id')).toBe(true);
  });

  test('Modify search works', async ({ page }) => {
    const ok = await gotoResults(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    const modifyBtn = page.locator('#tb-results-modify-btn');
    if (await modifyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await modifyBtn.click();
      await expect(page.locator('#tb-results-search-edit')).toBeVisible({ timeout: 3_000 });
      const cancelBtn = page.locator('#tb-results-cancel-btn');
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await expect(page.locator('#tb-results-search-edit')).not.toBeVisible();
      }
    }
  });
});
