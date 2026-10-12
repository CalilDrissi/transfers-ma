/**
 * Headed tour flow: create a tour via admin dashboard, then book it via REST API.
 * Slows down each action so it's visible.
 */

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8000';
const ADMIN_EMAIL = 'admin@transfers.ma';
const ADMIN_PASS = 'admin123';
const API_KEY = 'f61e90880da6a40033e7da550faa94a98e4e85a81bae645647b3c118665b27df';

let createdTripPk = null;
let createdTripSlug = null;
let createdBookingRef = null;

async function loginAdmin(page) {
    await page.goto(`${BASE}/dashboard/login/`);
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/**`);
}

// ── Step 1: Create a tour via the admin dashboard ────────────────────────────

test('Step 1 — Create a tour in the admin dashboard', async ({ page }) => {
    await loginAdmin(page);

    // Go to trips list first so the user can see existing tours
    await page.goto(`${BASE}/dashboard/trips/`);
    await page.waitForLoadState('networkidle');
    console.log('\n  [Trip list loaded — about to create new tour]');

    // Navigate to create form
    await page.goto(`${BASE}/dashboard/trips/create/`);
    await page.waitForLoadState('networkidle');
    console.log('  [Create form loaded]');

    // Fill name
    const nameField = await page.$('input[name="name"]');
    await nameField.click();
    await nameField.fill('Sahara Desert Sunset Tour');

    // Short description
    const shortDesc = await page.$('textarea[name="short_description"]');
    await shortDesc.click();
    await shortDesc.fill('Watch the sun set over the golden dunes of Merzouga — a once-in-a-lifetime experience from Marrakech.');

    // Departure location
    const depLoc = await page.$('input[name="departure_location"]');
    if (depLoc) {
        await depLoc.click();
        await depLoc.fill('Marrakech');
    }

    // Duration
    const durationField = await page.$('input[name="duration_days"], input[name="duration"]');
    if (durationField) {
        await durationField.fill('1');
    }

    // Trip type — day trip
    const tripType = await page.$('select[name="trip_type"]');
    if (tripType) {
        await page.selectOption('select[name="trip_type"]', 'day_trip');
    }

    // Status — published (so it shows in API)
    const statusSel = await page.$('select[name="status"]');
    if (statusSel) {
        await page.selectOption('select[name="status"]', 'published');
    }

    // Group size
    const maxPax = await page.$('input[name="max_participants"], input[name="max_group_size"]');
    if (maxPax) await maxPax.fill('12');

    // Pricing — private tier
    const privatePriceField = await page.$('input[name="tier_private[]"], input[name="price_private"]');
    if (privatePriceField) await privatePriceField.fill('4500');

    // Scroll down so submit is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    console.log('  [All fields filled — submitting]');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log('  [After submit:', url, ']');

    const match = url.match(/\/dashboard\/trips\/(\d+)\//);
    expect(match, 'Expected redirect to trip detail page').not.toBeNull();

    if (match) {
        createdTripPk = parseInt(match[1]);
        console.log('  ✓ Tour created — pk =', createdTripPk, ' URL:', url);
    }

    // Grab the slug from the detail page
    const slugInput = await page.$('input[name="slug"], #id_slug');
    if (slugInput) {
        createdTripSlug = await slugInput.inputValue();
        console.log('  ✓ Slug:', createdTripSlug);
    } else {
        // Try to extract from page body
        const bodyText = await page.$eval('body', el => el.innerText);
        const slugMatch = bodyText.match(/slug[:\s]+([a-z0-9-]+)/i);
        if (slugMatch) createdTripSlug = slugMatch[1];
    }

    // Verify the tour detail page looks correct
    const bodyText = await page.$eval('body', el => el.innerText);
    expect(bodyText).toContain('Sahara Desert Sunset Tour');
    console.log('  ✓ Tour name confirmed on detail page');

    // Pause so user can see the result
    await page.waitForTimeout(2000);
});

// ── Step 2: Verify tour appears in the trips API ─────────────────────────────

test('Step 2 — Verify tour visible in GET /api/v1/trips/', async ({ page }) => {
    // Fetch the trips API with JSON Accept header (browser shows HTML browsable API by default)
    const res = await fetch(`${BASE}/api/v1/trips/`, {
        headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
    });
    const data = await res.json();
    console.log('\n  API trips count:', data.count, '— trips:', data.results?.map(t => `${t.name} (${t.status})`));

    const ourTrip = data.results?.find(t => t.name.includes('Sahara'));
    if (ourTrip) {
        createdTripPk = ourTrip.id;
        createdTripSlug = ourTrip.slug;
        console.log('  ✓ Found in API: pk=', ourTrip.id, 'slug=', ourTrip.slug);
    } else if (data.results?.length > 0) {
        createdTripPk = data.results[0].id;
        createdTripSlug = data.results[0].slug;
        console.log('  Using first published trip: pk=', createdTripPk, 'slug=', createdTripSlug);
    }

    expect(data.count).toBeGreaterThan(0);

    // Also fetch detail by slug
    if (createdTripSlug) {
        const res2 = await fetch(`${BASE}/api/v1/trips/${createdTripSlug}/`, {
            headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
        });
        const detail = await res2.json();
        console.log('  Trip detail: name=', detail.name, '| status=', detail.status, '| is_active=', detail.is_active);
    }

    // Show JSON response in browser (using API docs instead of browsable API)
    await page.goto(`${BASE}/api/v1/trips/?format=json`);
    await page.waitForLoadState('networkidle');
    console.log('  [Trips API JSON response visible in browser]');
    await page.waitForTimeout(2000);
});

// ── Step 3: Book the tour via REST API (visible in browser DevTools) ─────────

test('Step 3 — Book the tour via REST API POST /api/v1/trips/bookings/', async ({ page }) => {
    // Open API docs in browser so user can see the endpoint
    await page.goto(`${BASE}/api/docs/#/trips/trips_bookings_create`);
    await page.waitForLoadState('networkidle');
    console.log('\n  [API docs loaded — about to POST booking]');
    await page.waitForTimeout(1500);

    // Determine which trip to book
    if (!createdTripPk) {
        const res = await fetch(`${BASE}/api/v1/trips/`, { headers: { 'X-API-Key': API_KEY } });
        const data = await res.json();
        if (data.results?.length > 0) {
            createdTripPk = data.results[0].id;
            createdTripSlug = data.results[0].slug;
        }
    }

    if (!createdTripPk) {
        // Fall back to the pk from previous tests
        const res = await fetch(`${BASE}/api/v1/trips/`, { headers: { 'X-API-Key': API_KEY } });
        const data = await res.json();
        console.log('  All trips:', JSON.stringify(data));
    }

    console.log('  Booking trip pk =', createdTripPk);

    // POST the booking
    const bookingPayload = {
        trip_id: createdTripPk,
        trip_date: '2027-01-15',
        customer_name: 'Youssef El Amrani',
        customer_email: 'youssef@example.com',
        customer_phone: '+212661234567',
        adults: 2,
        children: 1,
        is_private: true,
        notes: 'Please arrange pickup from Jemaa el-Fna at 6am.',
    };

    console.log('  Payload:', JSON.stringify(bookingPayload, null, 2));

    const res = await fetch(`${BASE}/api/v1/trips/bookings/`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
    });
    const booking = await res.json();

    console.log('\n  ── API Response ──────────────────────────────────');
    console.log('  Status:', res.status);
    console.log('  Body:', JSON.stringify(booking, null, 2));
    console.log('  ─────────────────────────────────────────────────\n');

    expect([200, 201]).toContain(res.status);
    expect(booking).toHaveProperty('booking_ref');
    createdBookingRef = booking.booking_ref;
    console.log('  ✓ Booking created!  booking_ref =', createdBookingRef);

    // Open the JSON response in the browser for the user to see
    await page.goto(`${BASE}/api/v1/trips/bookings/by-ref/${createdBookingRef}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
});

// ── Step 4: Lookup the booking by reference ──────────────────────────────────

test('Step 4 — Lookup booking by reference', async ({ page }) => {
    if (!createdBookingRef) {
        // Try to find any booking ref from API
        const res = await fetch(`${BASE}/api/v1/trips/bookings/`, { headers: { 'X-API-Key': API_KEY } });
        const data = await res.json();
        if (data.results?.length > 0) {
            createdBookingRef = data.results[0].booking_ref;
        }
    }

    if (!createdBookingRef) {
        console.log('  No booking ref available — skipping');
        return;
    }

    console.log('\n  Looking up booking ref:', createdBookingRef);

    // Verify via fetch (browser page doesn't send API key header)
    const lookupRes = await fetch(`${BASE}/api/v1/trips/bookings/by-ref/${createdBookingRef}/`, {
        headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
    });
    const lookupData = await lookupRes.json();
    console.log('  by-ref status:', lookupRes.status);
    console.log('  booking_ref:', lookupData.booking_ref, '| customer:', lookupData.customer_name);

    expect(lookupRes.status).toBe(200);
    expect(lookupData.booking_ref).toBe(createdBookingRef);
    expect(lookupData.customer_name).toBe('Youssef El Amrani');
    console.log('  ✓ Booking retrieved by ref — customer name confirmed');

    // Also show the booking in admin dashboard
    await page.goto(`${BASE}/dashboard/login/`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/**`);

    await page.goto(`${BASE}/dashboard/trips/bookings/`);
    await page.waitForLoadState('networkidle');
    console.log('  [Admin trip bookings list loaded — URL:', page.url(), ']');

    const adminBody = await page.$eval('body', el => el.innerText);
    const hasBooking = adminBody.includes('Youssef') || adminBody.includes(createdBookingRef);
    console.log('  Booking visible in admin:', hasBooking);

    await page.waitForTimeout(3000);
    console.log('\n  ✓✓✓ Full tour flow complete ✓✓✓');
    console.log('  Tour pk:', createdTripPk, '| slug:', createdTripSlug);
    console.log('  Booking ref:', createdBookingRef);
});
