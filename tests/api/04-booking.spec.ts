import { test, expect } from '@playwright/test';
import { API_BASE, API_KEY, MARRAKECH_AIRPORT, MARRAKECH_MEDINA, tomorrowISO } from '../helpers/fixtures';
import { ApiClient } from '../helpers/api-client';

let bookingRef = '';
let bookingId = 0;
let categoryId = 0;

test.describe('Booking API', () => {
  test.beforeAll(async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.getCategories();
    if (resp.ok()) {
      const data = await resp.json();
      const results = data.results || data;
      if (Array.isArray(results) && results.length > 0) {
        categoryId = results[0].id;
      }
    }
  });

  test('creates a transfer booking', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    test.skip(!categoryId, 'No vehicle category found');

    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.createBooking({
      customer_name: 'Playwright Test',
      customer_email: 'playwright@test.com',
      customer_phone: '+212600000000',
      transfer_type: 'city_to_city',
      pickup_address: 'Marrakech Menara Airport',
      pickup_latitude: MARRAKECH_AIRPORT.lat,
      pickup_longitude: MARRAKECH_AIRPORT.lng,
      dropoff_address: 'Marrakech Medina',
      dropoff_latitude: MARRAKECH_MEDINA.lat,
      dropoff_longitude: MARRAKECH_MEDINA.lng,
      pickup_datetime: tomorrowISO(),
      passengers: 2,
      luggage: 2,
      vehicle_category: categoryId,
      special_requests: 'Playwright E2E test',
    });
    expect(resp.status()).toBe(201);
    const data = await resp.json();
    expect(data.booking_ref).toBeTruthy();
    expect(Number(data.total_price)).toBeGreaterThan(0);
    bookingRef = data.booking_ref;
    bookingId = data.id;
  });

  test('retrieves booking by ref', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    test.skip(!bookingRef, 'No booking created');

    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.getBookingByRef(bookingRef);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.customer_name).toBe('Playwright Test');
    expect(data.booking_ref).toBe(bookingRef);
  });

  test('404 for invalid ref', async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.getBookingByRef('INVALID999');
    if (resp.status() === 401 || resp.status() === 403) {
      test.skip(true, 'API key required');
      return;
    }
    expect(resp.status()).toBe(404);
  });

  test('400 for empty body', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.createBooking({});
    expect(resp.status()).toBe(400);
  });
});

export { bookingRef, bookingId };
