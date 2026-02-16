import { APIRequestContext } from '@playwright/test';

export class ApiClient {
  constructor(
    private request: APIRequestContext,
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['X-API-Key'] = this.apiKey;
    return h;
  }

  async get(path: string, params?: Record<string, string>) {
    let url = `${this.baseUrl}${path}`;
    if (params) url += '?' + new URLSearchParams(params).toString();
    return this.request.get(url, { headers: this.headers() });
  }

  async post(path: string, body?: any) {
    return this.request.post(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      data: body,
    });
  }

  async searchRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    return this.get('/api/v1/locations/routes/get_pricing/', {
      origin_lat: String(fromLat),
      origin_lng: String(fromLng),
      destination_lat: String(toLat),
      destination_lng: String(toLng),
    });
  }

  async getCategories() {
    return this.get('/api/v1/vehicles/categories/');
  }

  async getExtras() {
    return this.get('/api/v1/transfers/extras/');
  }

  async getGateways() {
    return this.get('/api/v1/payments/gateways/');
  }

  async createBooking(data: any) {
    return this.post('/api/v1/transfers/', data);
  }

  async getBookingByRef(ref: string) {
    return this.get(`/api/v1/transfers/by-ref/${ref}/`);
  }

  async createPayment(data: any) {
    return this.post('/api/v1/payments/', data);
  }

  async validateCoupon(code: string, bookingType: string, amount: number) {
    return this.post('/api/v1/payments/coupons/validate/', {
      code,
      booking_type: bookingType,
      amount,
    });
  }

  async getTrips() {
    return this.get('/api/v1/trips/');
  }
}
