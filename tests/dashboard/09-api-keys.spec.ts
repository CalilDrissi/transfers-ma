import { test, expect } from '@playwright/test';
import { checkPageLoadedOk, checkForErrors } from '../helpers/checks';

test.describe('Dashboard API Keys', () => {
  test('API keys list loads', async ({ page }) => {
    await page.goto('/dashboard/api-keys/');
    await checkPageLoadedOk(page, 'API Keys list');
    // Page loaded successfully — keys may or may not exist
  });

  test('create API key', async ({ page }) => {
    await page.goto('/dashboard/api-keys/');
    await checkForErrors(page);

    const createBtn = page.locator('button[data-bs-target="#createKeyModal"], a:has-text("Create"), button:has-text("Create")').first();
    await createBtn.click();
    await page.waitForSelector('#createKeyModal.show, #key_name', { timeout: 5_000 });

    await page.fill('#key_name', 'Playwright Key');
    await page.selectOption('#key_tier', 'standard');
    await page.click('#createKeyModal button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await checkForErrors(page);

    const keyInput = page.locator('#newKeyInput');
    if (await keyInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const generatedKey = await keyInput.inputValue();
      expect(generatedKey.length).toBeGreaterThan(10);
      console.log(`  🔑 Generated API key: ${generatedKey.substring(0, 8)}...`);
    }
  });

  test('new key in list', async ({ page }) => {
    await page.goto('/dashboard/api-keys/');
    await checkForErrors(page);
    const content = await page.textContent('body');
    expect(content).toContain('Playwright Key');
  });

  test('key detail loads', async ({ page }) => {
    await page.goto('/dashboard/api-keys/');
    const link = page.locator('a:has-text("Playwright Key")').first();
    if (!(await link.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Playwright Key not found');
      return;
    }
    await link.click();
    await page.waitForLoadState('networkidle');
    await checkPageLoadedOk(page, 'API Key detail');
    const content = await page.textContent('body');
    expect(content).toContain('Playwright Key');
  });

  test('revoke key', async ({ page }) => {
    await page.goto('/dashboard/api-keys/');
    const link = page.locator('a:has-text("Playwright Key")').first();
    if (!(await link.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Playwright Key not found');
      return;
    }
    await link.click();
    await page.waitForLoadState('networkidle');

    const revokeBtn = page.locator('button:has-text("Revoke")').first();
    if (await revokeBtn.isVisible()) {
      page.on('dialog', (d) => d.accept());
      await revokeBtn.click();
      await page.waitForLoadState('networkidle');
      await checkForErrors(page);
    }
  });
});
