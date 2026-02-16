import { test, expect } from '@playwright/test';
import { tomorrowDatetimeLocal } from '../helpers/fixtures';

test.describe('Search Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('search widget renders', async ({ page }) => {
    const widget = page.locator('.tb-search-widget');
    if (!(await widget.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search widget not found — add [transfers_search] shortcode to a page');
      return;
    }
    await expect(page.locator('input[data-field="from"]')).toBeVisible();
    await expect(page.locator('input[data-field="to"]')).toBeVisible();
    await expect(page.locator('input[data-field="date"]')).toBeVisible();
  });

  test('tab switching works', async ({ page }) => {
    const widget = page.locator('.tb-search-widget');
    if (!(await widget.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search widget not found');
      return;
    }

    const hourlyTab = page.locator('.tb-search-widget__tab[data-service="hourly"]');
    const transfersTab = page.locator('.tb-search-widget__tab[data-service="transfers"]');

    if (await hourlyTab.isVisible()) {
      await hourlyTab.click();
      await expect(hourlyTab).toHaveClass(/--active/);
      await transfersTab.click();
      await expect(transfersTab).toHaveClass(/--active/);
    }
  });

  test('fallback autocomplete shows results', async ({ page }) => {
    const widget = page.locator('.tb-search-widget');
    if (!(await widget.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search widget not found');
      return;
    }

    const fromInput = page.locator('input[data-field="from"]');
    await fromInput.click();
    await fromInput.fill('Marra');
    await page.waitForTimeout(500); // debounce

    const dropdown = page.locator('.tb-search-widget__autocomplete[data-for="from"]');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    const items = dropdown.locator('.tb-search-widget__autocomplete-item');
    expect(await items.count()).toBeGreaterThan(0);

    const texts = await items.allTextContents();
    expect(texts.some((t) => t.toLowerCase().includes('marrakech'))).toBe(true);
  });

  test('selecting autocomplete item fills hidden fields', async ({ page }) => {
    const widget = page.locator('.tb-search-widget');
    if (!(await widget.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search widget not found');
      return;
    }

    const fromInput = page.locator('input[data-field="from"]');
    await fromInput.click();
    await fromInput.fill('Marra');
    await page.waitForTimeout(500);

    const dropdown = page.locator('.tb-search-widget__autocomplete[data-for="from"]');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // Click item containing "Airport"
    const airportItem = dropdown.locator('.tb-search-widget__autocomplete-item:has-text("Airport")').first();
    if (await airportItem.isVisible()) {
      await airportItem.click();
    } else {
      // Click first item
      await dropdown.locator('.tb-search-widget__autocomplete-item').first().click();
    }

    const fromVal = await fromInput.inputValue();
    expect(fromVal.toLowerCase()).toContain('marrakech');

    const fromLat = page.locator('input[data-field="from_lat"]');
    expect(await fromLat.inputValue()).not.toBe('');
  });

  test('can fill To field via autocomplete', async ({ page }) => {
    const widget = page.locator('.tb-search-widget');
    if (!(await widget.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search widget not found');
      return;
    }

    const toInput = page.locator('input[data-field="to"]');
    await toInput.click();
    await toInput.fill('Marra');
    await page.waitForTimeout(500);

    const dropdown = page.locator('.tb-search-widget__autocomplete[data-for="to"]');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // Click "City Center" item if available, else first
    const cityItem = dropdown.locator('.tb-search-widget__autocomplete-item:has-text("City")').first();
    if (await cityItem.isVisible()) {
      await cityItem.click();
    } else {
      await dropdown.locator('.tb-search-widget__autocomplete-item').first().click();
    }

    const toLat = page.locator('input[data-field="to_lat"]');
    expect(await toLat.inputValue()).not.toBe('');
  });

  test('search validates empty fields', async ({ page }) => {
    const widget = page.locator('.tb-search-widget');
    if (!(await widget.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search widget not found');
      return;
    }

    // Clear fields and click search
    const fromInput = page.locator('input[data-field="from"]');
    await fromInput.fill('');
    const searchBtn = page.locator('[data-action="search"]');
    await searchBtn.click();
    await page.waitForTimeout(500);

    // Should not navigate — still on the same page
    expect(page.url()).not.toContain('from_lat');
  });

  test('successful search redirects to results', async ({ page }) => {
    const widget = page.locator('.tb-search-widget');
    if (!(await widget.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search widget not found');
      return;
    }

    // Fill From
    const fromInput = page.locator('input[data-field="from"]');
    await fromInput.click();
    await fromInput.fill('Marra');
    await page.waitForTimeout(500);
    const fromDropdown = page.locator('.tb-search-widget__autocomplete[data-for="from"]');
    if (await fromDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fromDropdown.locator('.tb-search-widget__autocomplete-item').first().click();
    }

    // Fill To
    const toInput = page.locator('input[data-field="to"]');
    await toInput.click();
    await toInput.fill('Marra');
    await page.waitForTimeout(500);
    const toDropdown = page.locator('.tb-search-widget__autocomplete[data-for="to"]');
    if (await toDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const items = toDropdown.locator('.tb-search-widget__autocomplete-item');
      // Pick second item to get different location
      if (await items.nth(1).isVisible()) {
        await items.nth(1).click();
      } else {
        await items.first().click();
      }
    }

    // Fill date
    const dateInput = page.locator('input[data-field="date"]');
    await dateInput.fill(tomorrowDatetimeLocal());

    // Search
    const searchBtn = page.locator('[data-action="search"]');
    await searchBtn.click();
    await page.waitForTimeout(3_000);

    // Should navigate to results page with params
    const url = page.url();
    expect(url.includes('from_lat') || url.includes('book-transfer')).toBe(true);
  });
});
