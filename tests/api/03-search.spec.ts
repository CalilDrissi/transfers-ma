import { test, expect } from '@playwright/test';
import { API_BASE, API_KEY, MARRAKECH_AIRPORT, MARRAKECH_MEDINA, CASABLANCA_AIRPORT, CASABLANCA_CITY } from '../helpers/fixtures';
import { ApiClient } from '../helpers/api-client';

test.describe('Search & Pricing API', () => {
  test('Marrakech route returns vehicles', async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.searchRoute(
      MARRAKECH_AIRPORT.lat, MARRAKECH_AIRPORT.lng,
      MARRAKECH_MEDINA.lat, MARRAKECH_MEDINA.lng,
    );
    if (resp.status() === 401 || resp.status() === 403) {
      test.skip(true, 'API key required');
      return;
    }
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.vehicle_options).toBeDefined();
    expect(data.vehicle_options.length).toBeGreaterThan(0);
    const first = data.vehicle_options[0];
    expect(first.category_name).toBeTruthy();
    expect(Number(first.price)).toBeGreaterThan(0);
  });

  test('response includes custom fields', async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.searchRoute(
      MARRAKECH_AIRPORT.lat, MARRAKECH_AIRPORT.lng,
      MARRAKECH_MEDINA.lat, MARRAKECH_MEDINA.lng,
    );
    if (resp.status() === 401 || resp.status() === 403) {
      test.skip(true, 'API key required');
      return;
    }
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data).toHaveProperty('highlights');
    expect(data).toHaveProperty('included_amenities');
    if (data.vehicle_options?.length > 0) {
      expect(data.vehicle_options[0]).toHaveProperty('category_tagline');
    }
  });

  test('returns 400 without coords', async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.get('/api/v1/locations/routes/get_pricing/');
    if (resp.status() === 401 || resp.status() === 403) {
      test.skip(true, 'API key required');
      return;
    }
    expect(resp.status()).toBe(400);
  });

  test('Casablanca route works', async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.searchRoute(
      CASABLANCA_AIRPORT.lat, CASABLANCA_AIRPORT.lng,
      CASABLANCA_CITY.lat, CASABLANCA_CITY.lng,
    );
    if (resp.status() === 401 || resp.status() === 403) {
      test.skip(true, 'API key required');
      return;
    }
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.vehicle_options?.length).toBeGreaterThan(0);
  });

  test('dashboard search works', async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.get('/api/v1/dashboard-search/', { q: 'Marrakech' });
    if (resp.status() === 401 || resp.status() === 403) {
      test.skip(true, 'API key required');
      return;
    }
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data).toHaveProperty('routes');
  });
});
