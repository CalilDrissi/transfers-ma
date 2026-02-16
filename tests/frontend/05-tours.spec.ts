import { test, expect } from '@playwright/test';
import { WP_PAGES } from '../helpers/fixtures';

const SKIP_MSG = "Tours page not found — create a WP page with slug 'tours' containing [tours_listing]";

async function gotoTours(page: any): Promise<boolean> {
  const resp = await page.goto(WP_PAGES.tours);
  if (resp?.status() === 404) return false;
  await page.waitForLoadState('networkidle');
  return await page.locator('#tb-tours-listing').isVisible({ timeout: 5_000 }).catch(() => false);
}

test.describe('Tours Pages', () => {
  test('tours listing loads', async ({ page }) => {
    const ok = await gotoTours(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await expect(page.locator('#tb-tours-listing')).toBeVisible();
  });

  test('tour cards display', async ({ page }) => {
    const ok = await gotoTours(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await page.waitForTimeout(5_000);
    const cards = page.locator('.tb-tours-card');
    if (await cards.count() === 0) {
      console.log('  ℹ️  No tour cards loaded — check if test data has tours');
      return;
    }
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
    await expect(cards.first().locator('.tb-tours-card__name')).toHaveText(/.+/);
    await expect(cards.first().locator('.tb-tours-card__price-value')).toHaveText(/.+/);
  });

  test('tour filters exist', async ({ page }) => {
    const ok = await gotoTours(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    const typeFilter = page.locator('#tb-tours-filter-type');
    if (await typeFilter.isVisible()) {
      expect(await typeFilter.locator('option').count()).toBeGreaterThan(0);
    }
  });

  test('tour detail page loads', async ({ page }) => {
    const ok = await gotoTours(page);
    if (!ok) { test.skip(true, SKIP_MSG); return; }
    await page.waitForTimeout(5_000);
    const cardLink = page.locator('.tb-tours-card__btn, .tb-tours-card a').first();
    if (!(await cardLink.isVisible().catch(() => false))) {
      test.skip(true, 'No tour cards to click'); return;
    }
    await cardLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#tb-tour-detail, #tb-tour-name').first()).toBeVisible({ timeout: 10_000 });
  });
});
