import { test, expect } from '@playwright/test';
import { API_BASE, API_KEY, MARRAKECH_AIRPORT, MARRAKECH_MEDINA, COUPONS, tomorrowISO } from '../helpers/fixtures';
import { ApiClient } from '../helpers/api-client';

let bookingId = 0;
let categoryId = 0;

test.describe('Payment API', () => {
  test.beforeAll(async ({ request }) => {
    if (!API_KEY) return;
    const client = new ApiClient(request, API_BASE, API_KEY);
    const catResp = await client.getCategories();
    if (catResp.ok()) {
      const cats = await catResp.json();
      const results = cats.results || cats;
      if (results.length > 0) categoryId = results[0].id;
    }
    if (categoryId) {
      const bResp = await client.createBooking({
        customer_name: 'Payment Test',
        customer_email: 'paytest@test.com',
        customer_phone: '+212600000001',
        transfer_type: 'city_to_city',
        pickup_address: 'Test Airport',
        pickup_latitude: MARRAKECH_AIRPORT.lat,
        pickup_longitude: MARRAKECH_AIRPORT.lng,
        dropoff_address: 'Test City',
        dropoff_latitude: MARRAKECH_MEDINA.lat,
        dropoff_longitude: MARRAKECH_MEDINA.lng,
        pickup_datetime: tomorrowISO(),
        passengers: 1,
        luggage: 1,
        vehicle_category: categoryId,
      });
      if (bResp.status() === 201) {
        const b = await bResp.json();
        bookingId = b.id;
      }
    }
  });

  test('lists gateways', async ({ request }) => {
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.getGateways();
    if (resp.status() === 401 || resp.status() === 403) {
      test.skip(true, 'API key required');
      return;
    }
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    const results = data.results || data;
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('creates cash payment', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    test.skip(!bookingId, 'No booking created');
    const client = new ApiClient(request, API_BASE, API_KEY);
    const resp = await client.createPayment({
      booking_type: 'transfer',
      booking_id: bookingId,
      gateway_type: 'cash',
    });
    expect(resp.status()).toBe(201);
  });

  test('creates payment with coupon', async ({ request }) => {
    test.skip(!API_KEY, 'Set API_KEY in .env');
    test.skip(!categoryId, 'No category found');
    const client = new ApiClient(request, API_BASE, API_KEY);
    const bResp = await client.createBooking({
      customer_name: 'Coupon Payment Test',
      customer_email: 'coupontest@test.com',
      customer_phone: '+212600000002',
      transfer_type: 'city_to_city',
      pickup_address: 'Test Airport',
      pickup_latitude: MARRAKECH_AIRPORT.lat,
      pickup_longitude: MARRAKECH_AIRPORT.lng,
      dropoff_address: 'Test City',
      dropoff_latitude: MARRAKECH_MEDINA.lat,
      dropoff_longitude: MARRAKECH_MEDINA.lng,
      pickup_datetime: tomorrowISO(),
      passengers: 2,
      luggage: 2,
      vehicle_category: categoryId,
    });
    if (bResp.status() !== 201) {
      test.skip(true, 'Could not create booking');
      return;
    }
    const booking = await bResp.json();
    const resp = await client.createPayment({
      booking_type: 'transfer',
      booking_id: booking.id,
      gateway_type: 'cash',
      coupon_code: COUPONS.welcome,
    });
    expect(resp.status()).toBe(201);
  });
});
