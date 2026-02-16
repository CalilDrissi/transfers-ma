export const API_BASE = process.env.API_BASE_URL || 'https://api.transfers.ma';
export const WP_BASE = process.env.WP_BASE_URL || 'https://transfers.ma';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@transfers.ma';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'testpass123';
export const WP_ADMIN_USER = process.env.WP_ADMIN_USER || 'admin';
export const WP_ADMIN_PASS = process.env.WP_ADMIN_PASS || 'GjhYKq$T9MiuV)3n';
export const API_KEY = process.env.API_KEY || '';

export const MARRAKECH_AIRPORT = { name: 'Marrakech Menara Airport', lat: 31.6069, lng: -8.0363 };
export const MARRAKECH_MEDINA = { name: 'Marrakech City Center', lat: 31.6295, lng: -7.9811 };
export const CASABLANCA_AIRPORT = { name: 'Casablanca Mohammed V Airport', lat: 33.3675, lng: -7.5898 };
export const CASABLANCA_CITY = { name: 'Casablanca City Center', lat: 33.5731, lng: -7.5898 };
export const ESSAOUIRA = { name: 'Essaouira', lat: 31.5085, lng: -9.7595 };

export const TEST_CUSTOMER = { name: 'Playwright Test', email: 'playwright@test.com', phone: '600000000' };
export const STRIPE_CARD = { number: '4242424242424242', exp: '12/30', cvc: '123' };

export const COUPONS = {
  welcome: 'WELCOME20',
  summer: 'SUMMER2025',
  vip: 'VIP100',
};

export const WP_PAGES = {
  results: '/book-transfer/',
  checkout: '/checkout/',
  confirmation: '/booking-confirmed/',
  tours: '/tours/',
};

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export function tomorrowDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function resultsPageURL(from: typeof MARRAKECH_AIRPORT, to: typeof MARRAKECH_MEDINA): string {
  return WP_PAGES.results +
    '?from=' + encodeURIComponent(from.name) +
    '&from_lat=' + from.lat +
    '&from_lng=' + from.lng +
    '&to=' + encodeURIComponent(to.name) +
    '&to_lat=' + to.lat +
    '&to_lng=' + to.lng +
    '&date=' + tomorrowISO() +
    '&passengers=2&luggage=2';
}

export function checkoutPageURL(): string {
  return WP_PAGES.checkout +
    '?from=Marrakech+Airport&from_lat=31.6069&from_lng=-8.0363' +
    '&to=Marrakech+Medina&to_lat=31.6295&to_lng=-7.9811' +
    '&date=' + tomorrowISO() +
    '&passengers=2&luggage=2&category_id=1&price=250&currency=MAD&deposit_percentage=30';
}
