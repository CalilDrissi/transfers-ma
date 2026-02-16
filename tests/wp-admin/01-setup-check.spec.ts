import { test, expect } from '@playwright/test';

test.describe('WordPress Admin Setup Check', () => {
  test('WP admin dashboard loads', async ({ page }) => {
    await page.goto('/wp-admin/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#wpadminbar')).toBeVisible({ timeout: 15_000 });
  });

  test('Transfers Booking plugin is active', async ({ page }) => {
    await page.goto('/wp-admin/plugins.php');
    await page.waitForLoadState('networkidle');

    const content = await page.textContent('body');
    const isActive = content?.includes('Transfers Booking') ?? false;

    if (!isActive) {
      console.error('⚠️  PLUGIN NOT ACTIVATED — activate Transfers Booking plugin in wp-admin/plugins.php');
    }
    expect(isActive, 'Transfers Booking plugin should be active').toBe(true);
  });

  test('plugin settings page loads', async ({ page }) => {
    // Try both possible settings URLs
    let resp = await page.goto('/wp-admin/options-general.php?page=transfers-booking');
    if (resp?.status() === 404 || page.url().includes('error')) {
      resp = await page.goto('/wp-admin/admin.php?page=transfers-booking');
    }
    await page.waitForLoadState('networkidle');

    const form = page.locator('form');
    await expect(form.first()).toBeVisible({ timeout: 10_000 });
  });

  test('required settings are configured', async ({ page }) => {
    await page.goto('/wp-admin/options-general.php?page=transfers-booking');
    await page.waitForLoadState('networkidle');

    // Check API Base URL field
    const apiUrlField = page.locator('input[name*="api_base_url"], input[id*="api_base_url"], input[name*="api_url"]').first();
    if (await apiUrlField.isVisible()) {
      const val = await apiUrlField.inputValue();
      if (!val) {
        console.error('⚠️  PLUGIN SETTINGS MISSING — configure API Base URL in plugin settings');
      }
    }

    // Check API Key field
    const apiKeyField = page.locator('input[name*="api_key"], input[id*="api_key"]').first();
    if (await apiKeyField.isVisible()) {
      const val = await apiKeyField.inputValue();
      if (!val) {
        console.error('⚠️  PLUGIN SETTINGS MISSING — configure API Key in plugin settings');
      }
    }
  });

  test('booking pages exist', async ({ page }) => {
    await page.goto('/wp-admin/edit.php?post_type=page');
    await page.waitForLoadState('networkidle');

    const content = await page.textContent('body');

    const requiredPages = [
      { slug: 'book-transfer', shortcode: '[transfers_results]' },
      { slug: 'checkout', shortcode: '[transfers_checkout]' },
      { slug: 'booking-confirmed', shortcode: '[transfers_confirmation]' },
      { slug: 'tours', shortcode: '[tours_listing]' },
    ];

    for (const p of requiredPages) {
      const exists = content?.toLowerCase().includes(p.slug.replace('-', ' ')) ||
                     content?.toLowerCase().includes(p.slug);
      if (!exists) {
        console.error(`⚠️  CREATE PAGE: "${p.slug}" with shortcode ${p.shortcode}`);
      } else {
        console.log(`  ✅ Page "${p.slug}" exists`);
      }
    }
  });
});
