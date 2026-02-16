import { test, expect } from '@playwright/test';
import { API_BASE } from '../helpers/fixtures';
import { ApiClient } from '../helpers/api-client';

const API_KEY = process.env.API_KEY || '';

test.describe('API Health', () => {
  test('API docs returns 200', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/api/docs/`);
    expect(resp.status()).toBe(200);
  });

  test('API schema returns 200', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/api/schema/`);
    expect(resp.status()).toBe(200);
  });

  test('dashboard login returns 200', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/dashboard/login/`);
    expect(resp.status()).toBe(200);
  });

  const endpoints = [
    { path: '/api/v1/vehicles/categories/', name: 'Vehicle Categories' },
    { path: '/api/v1/transfers/extras/', name: 'Transfer Extras' },
    { path: '/api/v1/payments/gateways/', name: 'Payment Gateways' },
    { path: '/api/v1/trips/', name: 'Trips' },
  ];

  for (const ep of endpoints) {
    test(`${ep.name} does not return 500`, async ({ request }) => {
      const client = new ApiClient(request, API_BASE, API_KEY);
      const resp = await client.get(ep.path);
      if (resp.status() === 500) {
        const body = await resp.text();
        if (body.includes('OperationalError') || body.includes('no such column')) {
          console.error('⚠️  MIGRATIONS NEEDED — run: python manage.py makemigrations && python manage.py migrate');
        }
      }
      expect(resp.status(), `${ep.name} returned 500`).not.toBe(500);
    });
  }
});
