import { test, expect } from '@playwright/test';
import { API_BASE, API_KEY, COUPONS } from '../helpers/fixtures';
import { ApiClient } from '../helpers/api-client';

test.describe('Coupon API', () => {
  test('validates WELCOME20', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.validateCoupon(COUPONS.welcome, 'transfer', 500);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.valid).toBe(true);
  });

  test('validates VIP100 fixed discount', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.validateCoupon(COUPONS.vip, 'transfer', 500);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.valid).toBe(true);
  });

  test('rejects FAKECOUPON', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.validateCoupon('FAKECOUPON', 'transfer', 500);
    const data = await resp.json();
    expect(resp.status() === 400 || data.valid === false).toBe(true);
  });
});
