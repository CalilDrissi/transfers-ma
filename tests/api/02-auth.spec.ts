import { test, expect } from '@playwright/test';
import { API_BASE, API_KEY } from '../helpers/fixtures';

test.describe('API Authentication', () => {
  test('rejects without API key on protected endpoint', async ({ request }) => {
    // Use transfers endpoint which requires auth (not categories which may be public)
    const resp = await request.post(`${API_BASE}/api/v1/transfers/`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    expect([401, 403]).toContain(resp.status());
  });

  test('rejects invalid key', async ({ request }) => {
    const resp = await request.post(`${API_BASE}/api/v1/transfers/`, {
      headers: { 'X-API-Key': 'fake_key_12345', 'Content-Type': 'application/json' },
      data: {},
    });
    expect([400, 401, 403]).toContain(resp.status());
  });

  test('accepts valid key', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    const resp = await request.get(`${API_BASE}/api/v1/vehicles/categories/`, {
      headers: { 'X-API-Key': API_KEY },
    });
    expect(resp.status()).toBe(200);
  });

  test('webhooks bypass auth', async ({ request }) => {
    const resp = await request.post(`${API_BASE}/api/v1/payments/webhooks/stripe/`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    expect(resp.status()).not.toBe(401);
    expect(resp.status()).not.toBe(403);
  });
});
