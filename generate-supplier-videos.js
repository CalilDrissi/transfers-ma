/**
 * TRANSFERS.MA — SUPPLIER PORTAL VIDEO TUTORIAL + HTML GUIDE + PDF
 *
 * Records tutorial videos for every supplier-portal feature.
 * Outputs:
 *   supplier-guide/videos/<step>.webm  — per-feature screencast
 *   supplier-guide/screenshots/<step>-*.png — key UI states
 *   supplier-guide/index.html          — interactive HTML guide
 *   supplier-guide/print.html          — print-optimised version (no video)
 *   supplier-guide/supplier-portal-guide.pdf — full PDF
 *
 * Usage:
 *   node generate-supplier-videos.js          # run all steps
 *   STEP=S3 node generate-supplier-videos.js  # run one step (e.g. S3 = Zones)
 *   PDF_ONLY=1 node generate-supplier-videos.js # rebuild PDF from existing print.html
 *
 * Prerequisites (run first on production):
 *   python manage.py demo_supplier --seed
 *
 * Cleanup (run after all videos are done):
 *   python manage.py demo_supplier --teardown
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURATION ====================
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'https://api.transfers.ma',
  admin: {
    email: 'admin@transfers.ma',
    password: 'testpass123',
  },
  supplier: {
    email: 'demo-tours@transfers.ma',
    password: 'DemoPass123!',
  },
  guideDir: './supplier-guide',
  videosDir: './supplier-guide/videos',
  screenshotsDir: './supplier-guide/screenshots',
  stateFile: './supplier-guide/state.json',
  adminAuthFile: './supplier-guide/admin-auth.json',
  supplierAuthFile: './supplier-guide/supplier-auth.json',
  viewport: { width: 1366, height: 768 },
  slowMo: 300,
};

// Create output directories
for (const dir of [
  CONFIG.guideDir,
  CONFIG.videosDir,
  CONFIG.screenshotsDir,
]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Persistent state across steps (created pks)
let STATE = { zone_pk: null, vehicle_pk: null, route_pk: null };
if (fs.existsSync(CONFIG.stateFile)) {
  try {
    STATE = { ...STATE, ...JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8')) };
  } catch {}
}
function saveState() {
  fs.writeFileSync(CONFIG.stateFile, JSON.stringify(STATE, null, 2));
}

// Screenshots captured this run (step-name → array of paths)
const SCREENSHOTS = {};

// ==================== HELPER FUNCTIONS ====================

async function scrollDown(page, pixels = 300) {
  await page.mouse.wheel(0, pixels);
  await page.waitForTimeout(500);
}
async function scrollUp(page, pixels = 300) {
  await page.mouse.wheel(0, -pixels);
  await page.waitForTimeout(500);
}

async function scrollToElement(page, selector) {
  try {
    const element = await page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        const viewportHeight = CONFIG.viewport.height;
        const targetY = box.y - viewportHeight / 3;
        const currentScroll = await page.evaluate(() => window.scrollY);
        const scrollAmount = targetY - currentScroll;
        const steps = Math.abs(Math.ceil(scrollAmount / 100));
        const stepAmount = scrollAmount / Math.max(steps, 1);
        for (let i = 0; i < steps; i++) {
          await page.mouse.wheel(0, stepAmount);
          await page.waitForTimeout(50);
        }
        await page.waitForTimeout(300);
      }
    }
  } catch {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, selector).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function clickWithHighlight(page, selector, description = '') {
  try {
    await page.waitForSelector(selector, { timeout: 8000 });
    await scrollToElement(page, selector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.style.outline = '3px solid #0d6efd';
        el.style.outlineOffset = '3px';
        el.style.transition = 'outline 0.2s';
      }
    }, selector);
    await page.waitForTimeout(600);
    await page.click(selector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.style.outline = 'none';
    }, selector);
    await page.waitForTimeout(CONFIG.slowMo);
    console.log(`    ✓ Clicked: ${description || selector}`);
  } catch (e) {
    console.log(`    ⚠ Could not click: ${description || selector} — ${e.message.split('\n')[0]}`);
  }
}

async function typeSlowly(page, selector, text, description = '') {
  try {
    await page.waitForSelector(selector, { timeout: 8000 });
    await scrollToElement(page, selector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) { el.style.outline = '3px solid #0d6efd'; el.style.outlineOffset = '3px'; }
    }, selector);
    await page.click(selector);
    await page.waitForTimeout(200);
    await page.fill(selector, '');
    for (const char of text) {
      await page.type(selector, char, { delay: 55 });
    }
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.style.outline = 'none';
    }, selector);
    await page.waitForTimeout(CONFIG.slowMo);
    console.log(`    ✓ Typed: ${description || text}`);
  } catch (e) {
    console.log(`    ⚠ Could not type: ${description || selector} — ${e.message.split('\n')[0]}`);
  }
}

async function fillHidden(page, selector, value) {
  await page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel);
    if (el) {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, [selector, value]);
}

async function showCaption(page, text, duration = 2400) {
  await page.evaluate((t) => {
    let cap = document.getElementById('sp-caption');
    if (!cap) {
      cap = document.createElement('div');
      cap.id = 'sp-caption';
      cap.style.cssText = `
        position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:rgba(26,41,64,0.92);color:#fff;padding:14px 28px;
        border-radius:8px;font-family:system-ui,sans-serif;font-size:18px;
        font-weight:500;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.4);
        max-width:80%;text-align:center;border-left:4px solid #3b9ddd;
      `;
      document.body.appendChild(cap);
    }
    cap.textContent = t;
    cap.style.display = 'block';
  }, text);
  await page.waitForTimeout(duration);
  await page.evaluate(() => {
    const c = document.getElementById('sp-caption');
    if (c) c.style.display = 'none';
  });
}

async function selectOption(page, selector, value) {
  try {
    await page.selectOption(selector, value);
    await page.waitForTimeout(400);
    console.log(`    ✓ Selected: ${value}`);
  } catch (e) {
    console.log(`    ⚠ Could not select ${selector}: ${e.message.split('\n')[0]}`);
  }
}

async function screenshot(page, stepId, name) {
  const filename = `${stepId}-${name}.png`;
  const filepath = path.join(CONFIG.screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  if (!SCREENSHOTS[stepId]) SCREENSHOTS[stepId] = [];
  SCREENSHOTS[stepId].push({ filename, label: name.replace(/-/g, ' ') });
  console.log(`    📸 ${filename}`);
  return filepath;
}

// Scope a POST form by its action value and fill+submit
async function submitFormAction(page, actionValue, fields, buttonText = null) {
  // Find the form with input[name=action][value=actionValue]
  const formLocator = page.locator(`form:has(input[name="action"][value="${actionValue}"])`).first();
  await formLocator.waitFor({ timeout: 8000 });
  await formLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // Fill fields within this form
  for (const [name, value] of Object.entries(fields)) {
    const input = formLocator.locator(`[name="${name}"]`).first();
    try {
      const tag = await input.evaluate(el => el.tagName.toLowerCase());
      if (tag === 'select') {
        await input.selectOption(String(value));
      } else if (tag === 'textarea') {
        await input.fill(String(value));
      } else {
        const type = await input.evaluate(el => el.getAttribute('type') || 'text');
        if (type === 'checkbox') {
          const checked = await input.isChecked();
          if ((value && !checked) || (!value && checked)) await input.click();
        } else {
          await input.fill(String(value));
        }
      }
    } catch (e) {
      console.log(`    ⚠ Could not fill ${name}: ${e.message.split('\n')[0]}`);
    }
  }
  await page.waitForTimeout(300);
  let btn;
  if (buttonText) {
    btn = formLocator.locator(`button:has-text("${buttonText}")`).first();
  } else {
    btn = formLocator.locator('button[type="submit"]').first();
  }
  await btn.scrollIntoViewIfNeeded();
  await btn.evaluate(el => { el.style.outline = '3px solid #0d6efd'; el.style.outlineOffset = '3px'; });
  await page.waitForTimeout(500);
  await btn.click();
  await page.waitForTimeout(300);
}

// ==================== AUTH ====================

async function loginAdmin(page) {
  console.log('  🔐 Admin login…');
  await page.goto(`${CONFIG.baseUrl}/dashboard/login/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.fill('input[name="email"]', CONFIG.admin.email);
  await page.fill('input[name="password"]', CONFIG.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('  ✓ Admin logged in');
}

async function loginSupplier(page) {
  console.log('  🔐 Supplier login…');
  await page.goto(`${CONFIG.baseUrl}/supplier/login/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.fill('input[name="email"]', CONFIG.supplier.email);
  await page.fill('input[name="password"]', CONFIG.supplier.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('  ✓ Supplier logged in');
}

// ==================== STEPS ====================

const STEPS = {

  // ---- S1: Admin provisions the portal login ----
  S1: {
    name: 'S1-admin-provisioning',
    title: 'Admin: Creating Supplier Portal Login',
    auth: 'admin',
    record: async (page) => {
      await showCaption(page, 'Step 1: Admin creates a supplier portal login');

      // Navigate to suppliers list
      await page.goto(`${CONFIG.baseUrl}/dashboard/suppliers/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await showCaption(page, 'Open the Suppliers list in the admin dashboard');
      await screenshot(page, 'S1', '01-suppliers-list');

      // Find Demo Tours and click it
      await page.locator('table tbody tr:has-text("Demo Tours") a').first().click();
      await page.waitForTimeout(1500);
      await showCaption(page, 'Open the Demo Tours supplier record');
      await screenshot(page, 'S1', '02-supplier-detail');

      // Scroll to portal login card
      await scrollToElement(page, 'input[name="portal_email"]');
      await page.waitForTimeout(800);
      await showCaption(page, 'The "Supplier Portal Login" card — create a login here');
      await screenshot(page, 'S1', '03-portal-login-card');

      // Fill credentials
      await typeSlowly(page, 'input[name="portal_email"]', CONFIG.supplier.email, 'Portal email');
      await typeSlowly(page, 'input[name="portal_password"]', CONFIG.supplier.password, 'Portal password');

      await showCaption(page, 'Click "Create Portal Login" to provision the account');
      await screenshot(page, 'S1', '04-filled-credentials');

      await page.on('dialog', d => d.accept());
      await page.locator('form:has(input[name="action"][value="create_portal_login"]) button[type="submit"]').first().click();
      await page.waitForTimeout(2000);

      await showCaption(page, '✓ Portal login created — supplier can now log in at /supplier/');
      await screenshot(page, 'S1', '05-login-created');
    },
  },

  // ---- S2: Supplier login + dashboard home ----
  S2: {
    name: 'S2-login-dashboard',
    title: 'Supplier Login & Dashboard Overview',
    auth: 'supplier',
    record: async (page) => {
      // Start at login page (already handled by runner)
      await showCaption(page, 'Welcome to the Supplier Portal — log in with your credentials');
      await screenshot(page, 'S2', '01-login-page');

      await typeSlowly(page, 'input[name="email"]', CONFIG.supplier.email, 'Email');
      await typeSlowly(page, 'input[name="password"]', CONFIG.supplier.password, 'Password');
      await showCaption(page, 'Click Log In');
      await clickWithHighlight(page, 'button[type="submit"]', 'Log In');
      await page.waitForTimeout(2500);

      await showCaption(page, 'Welcome to your Supplier Dashboard!');
      await screenshot(page, 'S2', '02-dashboard-home');

      await showCaption(page, 'KPI cards: total bookings, this-month, status breakdown, earnings');
      await page.waitForTimeout(2000);
      await scrollDown(page, 300);
      await showCaption(page, 'Recent bookings appear at the bottom');
      await screenshot(page, 'S2', '03-recent-bookings');
      await scrollUp(page, 300);

      await showCaption(page, 'Sidebar navigation: Fleet, Pricing, Bookings, Earnings, Account');
      await page.waitForTimeout(2500);
      await screenshot(page, 'S2', '04-sidebar-nav');
    },
  },

  // ---- S3: Zones ----
  S3: {
    name: 'S3-zones',
    title: 'Creating & Managing Zones',
    auth: 'supplier',
    record: async (page) => {
      await page.goto(`${CONFIG.baseUrl}/supplier/zones/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await showCaption(page, 'My Zones — geographic areas where pickups/dropoffs happen');
      await screenshot(page, 'S3', '01-zone-list-empty');

      // Create zone
      await clickWithHighlight(page, 'a[href*="zones/create"]', 'New Zone');
      await page.waitForTimeout(1200);
      await showCaption(page, 'Create a new Zone — give it a name and colour');
      await screenshot(page, 'S3', '02-zone-create-form');

      await typeSlowly(page, 'input[name="name"]', 'Marrakech Airport Zone', 'Zone name');
      await typeSlowly(page, 'input[name="deposit_percentage"]', '20', 'Deposit %');
      await typeSlowly(page, 'textarea[name="client_notice"]', 'Free meet & greet at arrivals hall.', 'Client notice');

      await showCaption(page, 'Click "Create Zone" to save');
      await screenshot(page, 'S3', '03-zone-filled');
      await clickWithHighlight(page, 'button[type="submit"]', 'Create Zone');
      await page.waitForTimeout(2000);

      // Save zone pk from URL
      const zoneUrl = page.url();
      const zoneMatch = zoneUrl.match(/zones\/(\d+)\//);
      if (zoneMatch) {
        STATE.zone_pk = parseInt(zoneMatch[1]);
        saveState();
        console.log(`  ✓ Zone created: pk=${STATE.zone_pk}`);
      }

      await showCaption(page, 'Zone created! Now we\'re on the Zone detail page');
      await screenshot(page, 'S3', '04-zone-detail');

      // Set location (lat/lng/radius) — fill directly, don't use Maps autocomplete
      await showCaption(page, 'Set the zone\'s geographic center and radius');
      const hasLocationCard = await page.locator('input[name="center_latitude"]').isVisible().catch(() => false);
      if (hasLocationCard) {
        await scrollToElement(page, 'input[name="center_latitude"]');
        await page.waitForTimeout(600);
        // fill visible inputs
        await typeSlowly(page, 'input[name="center_latitude"]', '31.6069', 'Latitude');
        await typeSlowly(page, 'input[name="center_longitude"]', '-8.0363', 'Longitude');
        await typeSlowly(page, 'input[name="radius_km"]', '15', 'Radius km');
        await showCaption(page, 'Save the location');
        await screenshot(page, 'S3', '05-zone-location-filled');
        await submitFormAction(page, 'update_location', {}, 'Save');
        await page.waitForTimeout(1500);
        await showCaption(page, '✓ Zone center saved');
        await screenshot(page, 'S3', '06-zone-location-saved');
      }

      // Add distance range
      await showCaption(page, 'Add a Distance Range — defines pricing tiers by km');
      await scrollToElement(page, 'form:has(input[name="action"][value="add_range"])');
      await page.waitForTimeout(600);
      await screenshot(page, 'S3', '07-add-range-form');

      await submitFormAction(page, 'add_range', {
        range_name: '0–30 km',
        min_km: '0',
        max_km: '30',
      }, 'Add');
      await page.waitForTimeout(1500);
      await showCaption(page, '✓ Distance range added');
      await screenshot(page, 'S3', '08-range-added');

      // Add a second range
      await submitFormAction(page, 'add_range', {
        range_name: '31–80 km',
        min_km: '31',
        max_km: '80',
      }, 'Add');
      await page.waitForTimeout(1500);
      await screenshot(page, 'S3', '09-two-ranges');

      // Update first range (edit inline)
      await showCaption(page, 'Edit a range inline — update the name and save');
      const rangeRows = page.locator('form:has(input[name="action"][value="update_range"])');
      const firstRange = rangeRows.first();
      await firstRange.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const rangeNameInput = firstRange.locator('input[name="range_name"]');
      await rangeNameInput.fill('Downtown Zone (0–30 km)');
      await firstRange.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
      await showCaption(page, '✓ Range name updated');
      await screenshot(page, 'S3', '10-range-updated');

      await showCaption(page, 'Zones complete — distance ranges drive vehicle pricing tiers');
      await page.waitForTimeout(2000);
    },
  },

  // ---- S4: Vehicles ----
  S4: {
    name: 'S4-vehicles',
    title: 'Adding & Managing Your Fleet',
    auth: 'supplier',
    record: async (page) => {
      await page.goto(`${CONFIG.baseUrl}/supplier/vehicles/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await showCaption(page, 'My Vehicles — your fleet visible only to you');
      await screenshot(page, 'S4', '01-vehicle-list');

      // Status filter demo
      await showCaption(page, 'Filter by status to see available vs. maintenance vehicles');
      await screenshot(page, 'S4', '02-status-filter');

      // Create vehicle
      await clickWithHighlight(page, 'a[href*="vehicles/create"]', 'Add Vehicle');
      await page.waitForTimeout(1200);
      await showCaption(page, 'Add a new vehicle to your fleet');
      await screenshot(page, 'S4', '03-create-form');

      // Select category (Comfort Sedan = 11, or first option available)
      await showCaption(page, 'Choose a vehicle category');
      const catSelect = page.locator('select[name="category"]');
      // Try to select Comfort Sedan; fall back to whatever is first
      try {
        await catSelect.selectOption({ label: 'Comfort Sedan' });
      } catch {
        await catSelect.selectOption({ index: 1 });
      }
      await page.waitForTimeout(400);

      await typeSlowly(page, 'input[name="name"]', 'Demo Mercedes E-Class', 'Vehicle name');
      await typeSlowly(page, 'input[name="passengers"]', '4', 'Passengers');
      await typeSlowly(page, 'input[name="luggage"]', '3', 'Luggage');

      // Note type
      await selectOption(page, 'select[name="important_note_type"]', 'info');
      await typeSlowly(page, 'input[name="important_note"]', 'Free WiFi on board', 'Note');
      await typeSlowly(page, 'textarea[name="client_description"]', 'Comfortable executive sedan with air-conditioning and child seats available on request.', 'Description');

      await showCaption(page, 'Inline zone pricing — set customer price (EUR) and your cost (MAD)');
      await scrollDown(page, 400);

      // Fill zone pricing if visible
      const zonePriceInputs = page.locator('[name^="zone_price_"]');
      const zpCount = await zonePriceInputs.count();
      if (zpCount > 0) {
        await screenshot(page, 'S4', '04-zone-pricing-section');
        for (let i = 0; i < Math.min(zpCount, 2); i++) {
          const priceInput = zonePriceInputs.nth(i);
          const costInputName = (await priceInput.getAttribute('name')).replace('zone_price_', 'zone_cost_');
          await priceInput.fill('75');
          await page.locator(`[name="${costInputName}"]`).fill('280');
        }
        await showCaption(page, 'Price = what the customer pays (EUR) | Cost = what you receive (MAD)');
        await page.waitForTimeout(1500);
        await screenshot(page, 'S4', '05-pricing-filled');
      } else {
        await showCaption(page, 'Create zones first to see inline zone pricing here');
        await page.waitForTimeout(1500);
      }

      await scrollUp(page, 400);
      await showCaption(page, 'Click "Create Vehicle" to save');
      await clickWithHighlight(page, 'button[type="submit"]', 'Create Vehicle');
      await page.waitForTimeout(2000);

      // Save vehicle pk
      const vehicleUrl = page.url();
      const vehicleMatch = vehicleUrl.match(/vehicles\/(\d+)\//);
      if (vehicleMatch) {
        STATE.vehicle_pk = parseInt(vehicleMatch[1]);
        saveState();
        console.log(`  ✓ Vehicle created: pk=${STATE.vehicle_pk}`);
      }

      await showCaption(page, 'Vehicle created! Now on the vehicle detail page');
      await screenshot(page, 'S4', '06-vehicle-detail');

      // Edit vehicle
      await showCaption(page, 'Update vehicle details — edit any field and save');
      await submitFormAction(page, 'update_vehicle', { name: 'Demo Mercedes E-Class (2024)' }, 'Save Changes');
      await page.waitForTimeout(1500);
      await showCaption(page, '✓ Vehicle updated');
      await screenshot(page, 'S4', '07-vehicle-updated');

      // Add zone pricing from detail page
      await showCaption(page, 'Add zone pricing from the vehicle detail page');
      const addZoneForm = page.locator('form:has(input[name="action"][value="add_zone_pricing"])');
      const hasAddZone = await addZoneForm.count() > 0;
      if (hasAddZone) {
        await addZoneForm.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await screenshot(page, 'S4', '08-add-zone-pricing');

        // Select first distance range
        const drSelect = addZoneForm.locator('select[name="zone_distance_range"]');
        await drSelect.selectOption({ index: 1 });
        const priceInput = addZoneForm.locator('input[name="price"]');
        const costInput = addZoneForm.locator('input[name="cost"]');
        await priceInput.fill('85');
        await costInput.fill('320');
        await showCaption(page, 'Price (EUR) = customer rate  |  Cost (MAD) = your supplier rate');
        await page.waitForTimeout(1200);
        await addZoneForm.locator('button:has-text("Add")').click();
        await page.waitForTimeout(1500);
        await showCaption(page, '✓ Zone pricing row added');
        await screenshot(page, 'S4', '09-zone-pricing-added');
      }

      await showCaption(page, 'Fleet management complete');
      await page.waitForTimeout(2000);
    },
  },

  // ---- S5: Routes ----
  S5: {
    name: 'S5-routes',
    title: 'Creating Routes & Vehicle Pricing',
    auth: 'supplier',
    record: async (page) => {
      await page.goto(`${CONFIG.baseUrl}/supplier/routes/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await showCaption(page, 'My Routes — define origin-destination corridors with vehicle pricing');
      await screenshot(page, 'S5', '01-route-list');

      // Create route
      await clickWithHighlight(page, 'a[href*="routes/create"]', 'New Route');
      await page.waitForTimeout(1200);
      await showCaption(page, 'Create a new Route between two locations');
      await screenshot(page, 'S5', '02-route-create-form');

      await typeSlowly(page, 'input[name="name"]', 'Marrakech Airport ↔ City Centre', 'Route name');
      await typeSlowly(page, 'input[name="origin_name"]', 'Marrakech Menara Airport', 'Origin');
      await typeSlowly(page, 'input[name="destination_name"]', 'Jemaa el-Fna, Marrakech', 'Destination');

      // Fill coordinates directly (bypassing Google Maps autocomplete)
      await fillHidden(page, '#origin_lat', '31.6069');
      await fillHidden(page, '#origin_lng', '-8.0363');
      await fillHidden(page, '#destination_lat', '31.6258');
      await fillHidden(page, '#destination_lng', '-7.9892');

      await typeSlowly(page, 'input[name="origin_radius_km"]', '2', 'Origin radius');
      await typeSlowly(page, 'input[name="destination_radius_km"]', '5', 'Destination radius');
      await typeSlowly(page, 'input[name="distance_km"]', '6.5', 'Distance km');
      await typeSlowly(page, 'input[name="estimated_duration_minutes"]', '20', 'Duration min');

      await showCaption(page, 'Coordinates are set — radius defines the pickup/dropoff catchment area');
      await screenshot(page, 'S5', '03-route-filled');

      await clickWithHighlight(page, 'button[type="submit"]', 'Create Route');
      await page.waitForTimeout(2000);

      // Save route pk
      const routeUrl = page.url();
      const routeMatch = routeUrl.match(/routes\/(\d+)\//);
      if (routeMatch) {
        STATE.route_pk = parseInt(routeMatch[1]);
        saveState();
        console.log(`  ✓ Route created: pk=${STATE.route_pk}`);
      }

      await showCaption(page, 'Route created! Now set vehicle pricing on it');
      await screenshot(page, 'S5', '04-route-detail');

      // Add vehicle pricing
      const addVpForm = page.locator('form:has(input[name="action"][value="add_vehicle_pricing"])');
      const hasAddVp = await addVpForm.count() > 0;
      if (hasAddVp) {
        await addVpForm.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await showCaption(page, 'Add vehicle pricing — select your vehicle and set the price');
        await screenshot(page, 'S5', '05-add-vehicle-pricing');

        const vehicleSelect = addVpForm.locator('select[name="vehicle_id"]');
        await vehicleSelect.selectOption({ index: 1 });
        await addVpForm.locator('input[name="price"]').fill('65');
        await addVpForm.locator('input[name="cost"]').fill('240');
        await addVpForm.locator('input[name="min_booking_hours"]').fill('0');
        await showCaption(page, 'Price (EUR) customers pay  |  Cost (MAD) you receive');
        await page.waitForTimeout(1200);
        await addVpForm.locator('button:has-text("Add")').click();
        await page.waitForTimeout(1500);
        await showCaption(page, '✓ Vehicle pricing added to this route');
        await screenshot(page, 'S5', '06-vehicle-pricing-added');
      }

      // Add pickup sub-zone
      await showCaption(page, 'Pickup sub-zones — refine pricing by pickup location within the zone');
      const addPickupForm = page.locator('form:has(input[name="action"][value="add_pickup_zone"])');
      const hasPickup = await addPickupForm.count() > 0;
      if (hasPickup) {
        await addPickupForm.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await screenshot(page, 'S5', '07-pickup-subzone-form');
        await addPickupForm.locator('input[name="zone_name"]').fill('Terminal 1');
        await addPickupForm.locator('input[name="latitude"]').fill('31.6074');
        await addPickupForm.locator('input[name="longitude"]').fill('-8.0360');
        await addPickupForm.locator('input[name="radius_km"]').fill('0.5');
        await addPickupForm.locator('button:has-text("Add")').click();
        await page.waitForTimeout(1500);
        await showCaption(page, '✓ Pickup sub-zone added');
        await screenshot(page, 'S5', '08-pickup-subzone-added');
      }

      // Add dropoff sub-zone
      const addDropoffForm = page.locator('form:has(input[name="action"][value="add_dropoff_zone"])');
      const hasDropoff = await addDropoffForm.count() > 0;
      if (hasDropoff) {
        await addDropoffForm.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await addDropoffForm.locator('input[name="zone_name"]').fill('Jemaa el-Fna');
        await addDropoffForm.locator('input[name="latitude"]').fill('31.6258');
        await addDropoffForm.locator('input[name="longitude"]').fill('-7.9892');
        await addDropoffForm.locator('input[name="radius_km"]').fill('0.8');
        await addDropoffForm.locator('button:has-text("Add")').click();
        await page.waitForTimeout(1500);
        await showCaption(page, '✓ Dropoff sub-zone added');
        await screenshot(page, 'S5', '09-dropoff-subzone-added');
      }

      // Show update route
      await showCaption(page, 'You can also update the route details at any time');
      await scrollUp(page, 600);
      await submitFormAction(page, 'update_route', {
        distance_km: '6.8',
        estimated_duration_minutes: '22',
      }, 'Save Changes');
      await page.waitForTimeout(1500);
      await showCaption(page, '✓ Route updated');
      await screenshot(page, 'S5', '10-route-updated');
    },
  },

  // ---- S6: Bookings ----
  S6: {
    name: 'S6-bookings',
    title: 'Managing Bookings',
    auth: 'supplier',
    record: async (page) => {
      await page.goto(`${CONFIG.baseUrl}/supplier/bookings/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await showCaption(page, 'My Bookings — all transfers assigned to your company');
      await screenshot(page, 'S6', '01-booking-list');

      // Show filtering
      await showCaption(page, 'Filter by status, date range');
      await page.locator('select[name="status"]').selectOption('pending');
      await page.locator('button:has-text("Filter")').click();
      await page.waitForTimeout(1500);
      await showCaption(page, 'Showing pending bookings only');
      await screenshot(page, 'S6', '02-filtered-pending');

      // Clear filter
      await page.locator('a:has-text("Clear")').click();
      await page.waitForTimeout(1200);

      // Open a pending booking
      const pendingRow = page.locator('table tbody tr:has(.badge.bg-warning)').first();
      const hasPending = await pendingRow.count() > 0;
      if (hasPending) {
        await showCaption(page, 'Click a pending booking to view details and take action');
        const link = pendingRow.locator('a').first();
        await link.click();
        await page.waitForTimeout(1500);
        await showCaption(page, 'Booking detail — customer info, route, financials');
        await screenshot(page, 'S6', '03-booking-detail-pending');

        // Show financials
        await scrollToElement(page, '.col-lg-4');
        await showCaption(page, 'Financials: Your Cost (MAD) and Customer Price (EUR)');
        await page.waitForTimeout(1800);
        await screenshot(page, 'S6', '04-financials-card');

        // Confirm the booking
        await showCaption(page, 'Confirm the booking — status moves to Confirmed');
        await scrollToElement(page, 'form:has(input[name="action"][value="confirm"])');
        await page.waitForTimeout(400);
        await page.locator('form:has(input[name="action"][value="confirm"]) button[type="submit"]').click();
        await page.waitForTimeout(1800);
        await showCaption(page, '✓ Booking confirmed');
        await screenshot(page, 'S6', '05-booking-confirmed');

        // Mark completed
        await showCaption(page, 'Mark the booking as Completed after the transfer is done');
        await scrollToElement(page, 'form:has(input[name="action"][value="complete"])');
        await page.waitForTimeout(400);
        await page.locator('form:has(input[name="action"][value="complete"]) button[type="submit"]').click();
        await page.waitForTimeout(1800);
        await showCaption(page, '✓ Booking marked as Completed');
        await screenshot(page, 'S6', '06-booking-completed');
      }

      // Go back and cancel a different pending booking
      await page.goto(`${CONFIG.baseUrl}/supplier/bookings/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await page.locator('select[name="status"]').selectOption('pending');
      await page.locator('button:has-text("Filter")').click();
      await page.waitForTimeout(1200);

      const secondPending = page.locator('table tbody tr:has(.badge.bg-warning)').first();
      const hasSecondPending = await secondPending.count() > 0;
      if (hasSecondPending) {
        await secondPending.locator('a').first().click();
        await page.waitForTimeout(1500);
        await showCaption(page, 'Cancel a booking — confirm the cancellation dialog');
        await scrollToElement(page, 'form:has(input[name="action"][value="cancel"])');
        await page.waitForTimeout(400);
        await screenshot(page, 'S6', '07-cancel-button');
        page.once('dialog', d => d.accept());
        await page.locator('form:has(input[name="action"][value="cancel"]) button[type="submit"]').click();
        await page.waitForTimeout(1800);
        await showCaption(page, '✓ Booking cancelled');
        await screenshot(page, 'S6', '08-booking-cancelled');
      }

      await showCaption(page, 'Bookings management complete');
      await page.waitForTimeout(2000);
    },
  },

  // ---- S7: Earnings ----
  S7: {
    name: 'S7-earnings',
    title: 'Earnings & Revenue Report',
    auth: 'supplier',
    record: async (page) => {
      await page.goto(`${CONFIG.baseUrl}/supplier/earnings/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await showCaption(page, 'Earnings — your revenue and cost summary over time');
      await screenshot(page, 'S7', '01-earnings-overview');

      // Show stat cards
      await showCaption(page, 'Summary: total bookings, total cost (MAD), total revenue (EUR)');
      await page.waitForTimeout(2000);
      await screenshot(page, 'S7', '02-stat-cards');

      // Date filter
      await showCaption(page, 'Filter earnings by date range');
      const today = new Date();
      const firstOfYear = `${today.getFullYear()}-01-01`;
      const todayStr = today.toISOString().split('T')[0];
      await page.fill('input[name="date_from"]', firstOfYear);
      await page.fill('input[name="date_to"]', todayStr);
      await page.locator('button:has-text("Apply")').click();
      await page.waitForTimeout(1800);
      await showCaption(page, 'Year-to-date earnings filtered');
      await screenshot(page, 'S7', '03-filtered-earnings');

      // Monthly breakdown
      await showCaption(page, 'Monthly breakdown shows earnings per month');
      await scrollDown(page, 300);
      await page.waitForTimeout(1500);
      await screenshot(page, 'S7', '04-monthly-breakdown');

      // Transaction list
      await scrollDown(page, 300);
      await showCaption(page, 'Individual transactions with cost (MAD) and price (EUR)');
      await page.waitForTimeout(1500);
      await screenshot(page, 'S7', '05-transactions');

      // XLSX export
      await showCaption(page, 'Export earnings to Excel (.xlsx) for accounting');
      await scrollUp(page, 600);
      await page.waitForTimeout(800);
      await screenshot(page, 'S7', '06-export-button');
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.locator('a:has-text("Export .xlsx")').click(),
      ]);
      const xlsxPath = path.join(CONFIG.guideDir, 'demo-earnings.xlsx');
      await download.saveAs(xlsxPath);
      await showCaption(page, `✓ Excel file downloaded — "${download.suggestedFilename()}"`);
      await page.waitForTimeout(2000);
      await screenshot(page, 'S7', '07-xlsx-downloaded');
      console.log(`  📊 XLSX saved: ${xlsxPath}`);
    },
  },

  // ---- S8: Account ----
  S8: {
    name: 'S8-account',
    title: 'Account Settings',
    auth: 'supplier',
    record: async (page) => {
      await page.goto(`${CONFIG.baseUrl}/supplier/account/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await showCaption(page, 'Account Settings — update your company profile');
      await screenshot(page, 'S8', '01-account-page');

      // Update profile
      await showCaption(page, 'Update company name, email, phone, and notes');
      await typeSlowly(page, 'input[name="name"]', 'Demo Tours Morocco', 'Company name');
      await typeSlowly(page, 'input[name="phone"]', '+212661234567', 'Phone');
      await typeSlowly(page, 'textarea[name="notes"]', 'Premium transfer provider in Marrakech since 2019.', 'Notes');
      await screenshot(page, 'S8', '02-profile-filled');
      await submitFormAction(page, 'update_profile', {}, 'Save Profile');
      await page.waitForTimeout(1500);
      await showCaption(page, '✓ Profile saved — email also updates your login credentials');
      await screenshot(page, 'S8', '03-profile-saved');

      // Change password
      await showCaption(page, 'Change your password from this page');
      await scrollToElement(page, 'form:has(input[name="action"][value="change_password"])');
      await page.waitForTimeout(600);
      await screenshot(page, 'S8', '04-password-form');
      const newPw = 'DemoPass456!';
      const pwForm = page.locator('form:has(input[name="action"][value="change_password"])');
      await pwForm.locator('input[name="old_password"]').fill(CONFIG.supplier.password);
      await pwForm.locator('input[name="new_password1"]').fill(newPw);
      await pwForm.locator('input[name="new_password2"]').fill(newPw);
      await showCaption(page, 'Enter old password, new password, and confirm');
      await page.waitForTimeout(1200);
      await pwForm.locator('button:has-text("Change Password")').click();
      await page.waitForTimeout(1800);
      await showCaption(page, '✓ Password changed — you are still logged in');
      await screenshot(page, 'S8', '05-password-changed');

      // Restore original password so teardown / re-runs still work
      await showCaption(page, 'Changing back for demo reset…');
      const pwForm2 = page.locator('form:has(input[name="action"][value="change_password"])');
      await pwForm2.locator('input[name="old_password"]').fill(newPw);
      await pwForm2.locator('input[name="new_password1"]').fill(CONFIG.supplier.password);
      await pwForm2.locator('input[name="new_password2"]').fill(CONFIG.supplier.password);
      await pwForm2.locator('button:has-text("Change Password")').click();
      await page.waitForTimeout(1800);
      await showCaption(page, '✓ Password reset to original — demo is repeatable');

      await showCaption(page, 'Account settings complete');
      await page.waitForTimeout(2000);
    },
  },

  // ---- S9: Logout ----
  S9: {
    name: 'S9-logout',
    title: 'Logging Out',
    auth: 'supplier',
    record: async (page) => {
      // Navigate to home first
      await page.goto(`${CONFIG.baseUrl}/supplier/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await showCaption(page, 'When done, log out from the sidebar');

      // Scroll to or highlight the Logout link
      await scrollToElement(page, 'a[href*="logout"]');
      await page.waitForTimeout(800);
      await page.evaluate(() => {
        const logoutLink = [...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Logout');
        if (logoutLink) { logoutLink.style.outline = '3px solid #0d6efd'; logoutLink.style.outlineOffset = '3px'; }
      });
      await page.waitForTimeout(1200);
      await screenshot(page, 'S9', '01-logout-link');
      await showCaption(page, 'Click Logout to end the session securely');
      await page.locator('a[href*="logout"]').first().click();
      await page.waitForTimeout(2000);
      await showCaption(page, '✓ Logged out — redirected to login page');
      await screenshot(page, 'S9', '02-logged-out');
      await page.waitForTimeout(2000);
    },
  },
};

// ==================== RUNNER ====================

async function runStep(stepId, step) {
  console.log(`\n▶ ${stepId}: ${step.title}`);
  const videoPath = path.join(CONFIG.videosDir, `${step.name}.webm`);
  const authFile = step.auth === 'admin' ? CONFIG.adminAuthFile : CONFIG.supplierAuthFile;

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const contextOpts = {
    viewport: CONFIG.viewport,
    recordVideo: { dir: CONFIG.videosDir, size: CONFIG.viewport },
  };
  // Reuse saved session if available and fresh
  if (step.auth !== 'none' && fs.existsSync(authFile)) {
    const age = Date.now() - fs.statSync(authFile).mtimeMs;
    if (age < 50 * 60 * 1000) contextOpts.storageState = authFile; // 50 min TTL
  }
  const context = await browser.newContext(contextOpts);
  // Auto-accept confirm dialogs globally
  context.on('page', p => p.on('dialog', d => d.accept()));
  const page = await context.newPage();
  page.on('dialog', d => d.accept());

  try {
    // Pre-login if no saved session
    if (!contextOpts.storageState) {
      if (step.auth === 'admin') {
        await loginAdmin(page);
      } else if (step.auth === 'supplier') {
        // S2 records the login manually, so skip auto-login
        if (stepId !== 'S2') {
          await loginSupplier(page);
        } else {
          await page.goto(`${CONFIG.baseUrl}/supplier/login/`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1000);
        }
      }
      // Save session after S1 and after S2 (supplier)
      if (stepId === 'S1') {
        await context.storageState({ path: CONFIG.adminAuthFile });
        console.log('  💾 Admin session saved');
      }
    }

    await step.record(page);

    // Save supplier session after first supplier step
    if (step.auth === 'supplier' && !fs.existsSync(CONFIG.supplierAuthFile)) {
      await context.storageState({ path: CONFIG.supplierAuthFile });
      console.log('  💾 Supplier session saved');
    }
  } catch (e) {
    console.error(`  ✗ Step ${stepId} failed: ${e.message}`);
  }

  await page.waitForTimeout(1500);
  const videoPagePath = await page.video()?.path();
  await context.close();
  await browser.close();

  // Rename the raw webm to step name
  if (videoPagePath && fs.existsSync(videoPagePath)) {
    fs.renameSync(videoPagePath, videoPath);
    const sizeMb = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1);
    console.log(`  🎬 Video: ${videoPath} (${sizeMb} MB)`);
  }
}

// ==================== HTML GUIDE GENERATOR ====================

function buildHtmlGuide() {
  const GUIDE_CONTENT = {
    S1: {
      intro: 'Before a supplier can log into the portal, an admin must create a portal login from the dashboard. This only needs to be done once per supplier.',
      steps: [
        'Log in to the admin dashboard at <code>/dashboard/login/</code>.',
        'Go to <strong>Suppliers</strong> in the sidebar and open the supplier record.',
        'Scroll to the <strong>Supplier Portal Login</strong> card on the right.',
        'Enter an email address and a password (minimum 8 characters).',
        'Click <strong>Create Portal Login</strong>. The supplier can now log in.',
        'If the supplier needs a new password, use <strong>Update Login</strong> in the same card.',
        'To revoke access, click <strong>Remove Login</strong>.',
      ],
      tips: [
        'The portal login email can be different from the supplier\'s contact email.',
        'Passwords must be at least 8 characters.',
        'Removing the login deletes the user account — the supplier record itself is kept.',
      ],
    },
    S2: {
      intro: 'Suppliers log in at <strong>/supplier/login/</strong> with the credentials provided by the admin. The dashboard shows key business metrics at a glance.',
      steps: [
        'Go to <code>https://api.transfers.ma/supplier/login/</code>.',
        'Enter your email and password.',
        'Click <strong>Log In</strong>.',
        'The <strong>Dashboard Home</strong> shows total bookings, this-month count, status breakdown, total earnings (MAD cost + EUR revenue), and recent bookings.',
        'Use the sidebar to navigate: <em>My Vehicles, My Zones, My Routes, My Bookings, Earnings, Account</em>.',
      ],
      tips: [
        'Your session stays active for up to 50 minutes. Refresh the page if you are logged out.',
        'The sidebar can be collapsed on desktop by clicking the toggle arrow.',
        'On mobile the sidebar is hidden — tap the ☰ icon to open it.',
      ],
    },
    S3: {
      intro: 'Zones define geographic areas (e.g. "Marrakech Airport Zone"). Each zone has distance ranges which drive per-km pricing tiers on your vehicles.',
      steps: [
        'Go to <strong>My Zones</strong> in the sidebar.',
        'Click <strong>New Zone</strong>.',
        'Enter a name, optional colour, deposit percentage, and client notice.',
        'Click <strong>Create Zone</strong>.',
        'On the zone detail page, scroll to <strong>Zone Center & Radius</strong> and fill in latitude, longitude, and radius (km) to define where the zone sits on the map.',
        'Scroll to <strong>Distance Ranges</strong>. Add ranges with a name, minimum km, and maximum km (e.g. "0–30 km").',
        'Edit a range inline and click the ✓ button to save changes.',
        'Delete a range with the 🗑 button (confirm the dialog).',
      ],
      tips: [
        'Distance ranges are referenced when you set pricing on a vehicle — create them before adding vehicles.',
        'Radius defines how close a pickup/dropoff must be to the zone centre to match.',
        'You can have multiple overlapping ranges (e.g. 0–30, 31–80, 81–150) for tiered pricing.',
      ],
    },
    S4: {
      intro: 'Vehicles are the heart of your fleet. Each vehicle belongs to a category, and you set per-zone and per-route pricing directly on it.',
      steps: [
        'Go to <strong>My Vehicles</strong> in the sidebar.',
        'Click <strong>Add Vehicle</strong>.',
        'Select a <strong>Vehicle Category</strong>, enter a name, passenger capacity, and luggage capacity.',
        'Optionally add a note type and text (shown to customers), and a client description.',
        'If you have created Zones, an inline pricing section will appear — enter <strong>Price (EUR)</strong> (what the customer pays) and <strong>Cost (MAD)</strong> (what you receive).',
        'Click <strong>Create Vehicle</strong>.',
        'On the vehicle detail page you can: update details, add/edit/delete zone pricing rows, add/edit/delete route pricing rows, upload and manage vehicle photos.',
        'To upload a photo: scroll to <strong>Vehicle Images</strong>, choose a file, and click <strong>Upload</strong>. Click the ★ star button to set the primary image.',
      ],
      tips: [
        '<strong>Price (EUR)</strong> = what the customer pays. <strong>Cost (MAD)</strong> = what you receive from the platform. Always fill both.',
        'Set status to <em>Available</em> so the vehicle appears in search results.',
        'You can add pricing from the vehicle detail page even after creation.',
      ],
    },
    S5: {
      intro: 'Routes connect an origin to a destination (e.g. Marrakech Airport → City Centre). You set vehicle-level pricing on each route and optionally add pickup/dropoff sub-zones for granular fare adjustments.',
      steps: [
        'Go to <strong>My Routes</strong> in the sidebar.',
        'Click <strong>New Route</strong>.',
        'Enter a name, origin name and destination name. Fill in the distance and estimated duration.',
        'Click <strong>Create Route</strong>.',
        'On the route detail page, scroll to <strong>Vehicle Pricing on This Route</strong>. Select one of your vehicles, enter Price (EUR) and Cost (MAD), and click <strong>Add</strong>.',
        'Edit a pricing row inline with the ✓ button; delete it with 🗑.',
        'Scroll to <strong>Pickup Sub-Zones</strong> to add area-specific pickup points with a price adjustment.',
        'Add <strong>Dropoff Sub-Zones</strong> similarly.',
        'To delete the route, scroll to <strong>Danger Zone</strong> and click <strong>Delete Route</strong>.',
      ],
      tips: [
        'Coordinates are optional but improve matching precision — enter them as decimal degrees (e.g. 31.6069, -8.0363).',
        'Radius km defines the catchment area for origin/destination matching.',
        'Sub-zone price adjustments are additive (positive or negative).',
        'Check <em>Bidirectional</em> to allow the return direction automatically.',
      ],
    },
    S6: {
      intro: 'The Bookings section shows all transfers assigned to your company. You can confirm, complete, or cancel bookings from here.',
      steps: [
        'Go to <strong>My Bookings</strong> in the sidebar.',
        'Use the filters (status, date range) to narrow the list. Click <strong>Filter</strong> or <strong>Clear</strong>.',
        'Click a booking reference to open its detail page.',
        'Review the customer info, route, passengers, luggage, flight number, special requests.',
        'Check the <strong>Financials</strong> card — Your Cost (MAD) and Customer Price (EUR).',
        'If the booking is <em>Pending</em>, click <strong>Confirm Booking</strong> to move it to Confirmed.',
        'Click <strong>Mark Completed</strong> after the transfer is done (available for Pending and Confirmed bookings).',
        'Click <strong>Cancel</strong> to cancel a Pending or Confirmed booking (confirm the dialog).',
      ],
      tips: [
        'Bookings are created by customers via the website — you cannot create them from the portal.',
        'Completed and Cancelled bookings show "No actions available" in the actions card.',
        'The booking reference (e.g. TRF-ABC123) is used for customer communication.',
      ],
    },
    S7: {
      intro: 'The Earnings page shows a summary of your cost (MAD) and revenue (EUR) for any date period, broken down monthly and per transaction.',
      steps: [
        'Go to <strong>Earnings</strong> in the sidebar.',
        'The default view shows the current month.',
        'Adjust <strong>From</strong> and <strong>To</strong> dates and click <strong>Apply</strong> to filter.',
        'The summary cards show: total bookings, total cost (MAD), total revenue (EUR) for the period.',
        'Scroll down to see the <strong>Monthly Breakdown</strong> and the <strong>Transactions</strong> table.',
        'Click <strong>Export .xlsx</strong> (top right) to download an Excel file with all transactions in the period.',
      ],
      tips: [
        '<strong>Cost (MAD)</strong> = the amount the platform owes you per booking. <strong>Revenue (EUR)</strong> = the customer-facing price.',
        'The Excel export includes: booking ref, date, customer, category, status, cost, price.',
        'Use pagination at the bottom if there are many transactions.',
      ],
    },
    S8: {
      intro: 'Keep your company profile up to date and change your portal password from the Account page.',
      steps: [
        'Go to <strong>Account</strong> in the sidebar.',
        'In the <strong>Company Profile</strong> card: update your company name, email, phone, and notes.',
        'Click <strong>Save Profile</strong>. Note: updating the email here also changes your portal login email.',
        'In the <strong>Change Password</strong> card: enter your current password, then the new password twice.',
        'Click <strong>Change Password</strong>. You will stay logged in.',
        'The <strong>Login Info</strong> card on the right confirms your current email and role.',
      ],
      tips: [
        'If you forget your password, ask your admin to reset it from the supplier record in the dashboard.',
        'Password must be at least 8 characters.',
        'Your email is used for both login and customer-facing communications.',
      ],
    },
    S9: {
      intro: 'Always log out when you are finished, especially on shared devices.',
      steps: [
        'Click <strong>Logout</strong> at the bottom of the sidebar.',
        'You will be redirected to the login page.',
        'Your session is cleared — no one can access your account without your credentials.',
      ],
      tips: [
        'Sessions expire automatically after 50 minutes of inactivity.',
        'Log out before closing the browser tab on a shared computer.',
      ],
    },
  };

  const sections = [
    { id: 'S1', icon: 'bi-shield-lock', color: '#6f42c1', label: '1. Admin Setup' },
    { id: 'S2', icon: 'bi-house', color: '#0d6efd', label: '2. Login & Dashboard' },
    { id: 'S3', icon: 'bi-geo-alt', color: '#20c997', label: '3. Zones' },
    { id: 'S4', icon: 'bi-truck', color: '#fd7e14', label: '4. Fleet (Vehicles)' },
    { id: 'S5', icon: 'bi-signpost-split', color: '#6610f2', label: '5. Routes' },
    { id: 'S6', icon: 'bi-calendar-check', color: '#0dcaf0', label: '6. Bookings' },
    { id: 'S7', icon: 'bi-graph-up-arrow', color: '#198754', label: '7. Earnings' },
    { id: 'S8', icon: 'bi-person-circle', color: '#dc3545', label: '8. Account' },
    { id: 'S9', icon: 'bi-box-arrow-right', color: '#6c757d', label: '9. Logout' },
  ];

  function screenshotsHtml(stepId, relative = '') {
    const shots = SCREENSHOTS[stepId] || [];
    if (!shots.length) return '';
    return `<div class="screenshots-row">
      ${shots.map(s => `<figure class="screenshot-fig">
        <img src="${relative}screenshots/${s.filename}" alt="${s.label}" loading="lazy">
        <figcaption>${s.label.replace(/-/g, ' ')}</figcaption>
      </figure>`).join('\n      ')}
    </div>`;
  }

  function stepCardHtml(stepId, forPrint = false) {
    const step = STEPS[stepId];
    const guide = GUIDE_CONTENT[stepId] || { intro: '', steps: [], tips: [] };
    const section = sections.find(s => s.id === stepId);
    const videoFile = `${step.name}.webm`;
    const hasVideo = fs.existsSync(path.join(CONFIG.videosDir, videoFile));
    const relative = forPrint ? '' : '';

    const videoHtml = forPrint
      ? ''
      : hasVideo
        ? `<video controls preload="metadata" class="step-video"><source src="videos/${videoFile}" type="video/webm">Your browser does not support WebM video.</video>`
        : `<div class="no-video"><i class="bi bi-camera-video"></i><p>Video will appear here after generation</p></div>`;

    return `
  <div class="step-card" id="${stepId}">
    <div class="step-header" style="border-left-color:${section?.color || '#0d6efd'}">
      <span class="step-badge" style="background:${section?.color || '#0d6efd'}">${stepId}</span>
      <h2>${step.title}</h2>
    </div>
    <div class="step-body">
      <p class="step-intro">${guide.intro}</p>
      ${videoHtml}
      ${screenshotsHtml(stepId, relative)}
      <h3><i class="bi bi-list-check me-2"></i>Step-by-step</h3>
      <ol class="step-list">
        ${guide.steps.map(s => `<li>${s}</li>`).join('\n        ')}
      </ol>
      ${guide.tips.length ? `
      <div class="tips-box">
        <h4><i class="bi bi-lightbulb me-2"></i>Tips</h4>
        <ul>${guide.tips.map(t => `<li>${t}</li>`).join('\n          ')}</ul>
      </div>` : ''}
    </div>
  </div>`;
  }

  const commonCss = `
    :root { --navy: #1a2940; --accent: #3b9ddd; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f4f6f9; color: #212529; margin: 0; }
    a { color: var(--accent); }
    .hero { background: linear-gradient(135deg, var(--navy) 0%, #243b55 100%); color: #fff; padding: 3rem 1rem; }
    .hero h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; }
    .hero p { opacity: 0.85; margin: 0; }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 1rem; }
    .layout { display: grid; grid-template-columns: 240px 1fr; gap: 2rem; padding: 2rem 0; }
    .toc { position: sticky; top: 1rem; background: #fff; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 2px 12px rgba(0,0,0,0.07); height: fit-content; }
    .toc h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6c757d; margin-bottom: 1rem; }
    .toc a { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 0.5rem; text-decoration: none; color: #495057; font-size: 0.9rem; transition: background 0.15s; }
    .toc a:hover, .toc a.active { background: #f0f4ff; color: var(--navy); }
    .toc a i { font-size: 1rem; }
    .step-card { background: #fff; border-radius: 1rem; box-shadow: 0 2px 12px rgba(0,0,0,0.07); margin-bottom: 2.5rem; overflow: hidden; }
    .step-header { display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem 1.75rem; border-left: 5px solid var(--accent); background: #fcfcfc; border-bottom: 1px solid #eee; }
    .step-badge { color: #fff; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 1rem; white-space: nowrap; }
    .step-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; color: #1a1a2e; }
    .step-body { padding: 1.5rem 1.75rem; }
    .step-intro { color: #555; font-size: 1.05rem; margin-bottom: 1.5rem; }
    .step-video { width: 100%; border-radius: 0.5rem; margin-bottom: 1.5rem; background: #000; display: block; }
    .no-video { background: #f8f9fa; border-radius: 0.5rem; padding: 3rem; text-align: center; color: #6c757d; margin-bottom: 1.5rem; font-size: 2rem; }
    .no-video p { font-size: 1rem; margin-top: 0.5rem; }
    .screenshots-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
    .screenshot-fig { flex: 1 1 280px; max-width: 380px; margin: 0; }
    .screenshot-fig img { width: 100%; border-radius: 0.5rem; border: 1px solid #dee2e6; cursor: zoom-in; transition: transform 0.2s; }
    .screenshot-fig img:hover { transform: scale(1.02); }
    .screenshot-fig figcaption { font-size: 0.8rem; color: #6c757d; text-align: center; margin-top: 0.35rem; text-transform: capitalize; }
    h3 { font-size: 1rem; font-weight: 700; color: var(--navy); margin: 1.5rem 0 0.75rem; }
    .step-list { padding-left: 1.25rem; }
    .step-list li { margin-bottom: 0.5rem; line-height: 1.6; }
    .tips-box { background: #f0f9ff; border: 1px solid #b6e0f7; border-radius: 0.5rem; padding: 1rem 1.25rem; margin-top: 1.25rem; }
    .tips-box h4 { font-size: 0.9rem; font-weight: 700; color: #0b5394; margin-bottom: 0.5rem; }
    .tips-box ul { margin: 0; padding-left: 1.25rem; }
    .tips-box li { margin-bottom: 0.35rem; font-size: 0.9rem; color: #333; }
    @media (max-width: 768px) {
      .layout { grid-template-columns: 1fr; }
      .toc { position: static; }
      .screenshot-fig { max-width: 100%; }
    }
  `;

  // ---- index.html ----
  const tocHtml = sections.map(s =>
    `<a href="#${s.id}"><i class="bi ${s.icon}" style="color:${s.color}"></i> ${s.label}</a>`
  ).join('\n        ');

  const cardsHtml = sections.map(s => stepCardHtml(s.id, false)).join('\n');

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supplier Portal — User Guide | Transfers.ma</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
  <style>
    ${commonCss}
  </style>
</head>
<body>
  <div class="hero">
    <div class="container">
      <h1><i class="bi bi-building me-2"></i>Supplier Portal User Guide</h1>
      <p>Step-by-step tutorials with videos and screenshots — covering every feature of <strong>api.transfers.ma/supplier/</strong></p>
    </div>
  </div>
  <div class="container">
    <div class="layout">
      <aside class="toc">
        <h3><i class="bi bi-list-ul me-1"></i>Contents</h3>
        ${tocHtml}
      </aside>
      <main>
        ${cardsHtml}
        <p class="text-center" style="color:#aaa;font-size:0.8rem;padding:2rem 0">
          Generated by Transfers.ma · ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </main>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(CONFIG.guideDir, 'index.html'), indexHtml);
  console.log(`\n📄 HTML guide: ${CONFIG.guideDir}/index.html`);

  // ---- print.html ----
  const printCss = `
    ${commonCss}
    body { background: #fff; }
    .layout { display: block; padding: 0; }
    .toc { position: static; margin-bottom: 2rem; page-break-after: always; }
    .toc h3 { font-size: 1rem; }
    .toc a { padding: 0.35rem 0.5rem; }
    .step-card { page-break-inside: avoid; margin-bottom: 2rem; box-shadow: none; border: 1px solid #dee2e6; }
    .step-video, .no-video { display: none; }
    .screenshots-row { page-break-inside: avoid; }
    .screenshot-fig { flex: 1 1 220px; max-width: 320px; }
    .screenshot-fig img { cursor: default; }
    .screenshot-fig img:hover { transform: none; }
    @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
    @media print {
      .toc { page-break-after: always; }
      .step-card { page-break-inside: avoid; }
    }
    .cover { text-align: center; padding: 80px 40px; page-break-after: always; border: 3px solid var(--navy); border-radius: 1rem; margin-bottom: 2rem; }
    .cover h1 { font-size: 2.2rem; color: var(--navy); margin-bottom: 1rem; }
    .cover p { font-size: 1.1rem; color: #555; }
    .cover .cover-meta { margin-top: 3rem; font-size: 0.9rem; color: #888; }
  `;

  const printCardsHtml = sections.map(s => stepCardHtml(s.id, true)).join('\n');

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Supplier Portal User Guide — Transfers.ma</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
  <style>${printCss}</style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <i class="bi bi-building" style="font-size:3rem;color:var(--navy);display:block;margin-bottom:1.5rem"></i>
      <h1>Supplier Portal<br>User Guide</h1>
      <p>A complete reference for every feature of the Transfers.ma Supplier Portal</p>
      <div class="cover-meta">
        <strong>Portal URL:</strong> https://api.transfers.ma/supplier/<br>
        Generated: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
    <div class="toc">
      <h3>Contents</h3>
      ${sections.map(s => `<a href="#${s.id}"><i class="bi ${s.icon}" style="color:${s.color}"></i> ${s.label}</a>`).join('\n      ')}
    </div>
    ${printCardsHtml}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(CONFIG.guideDir, 'print.html'), printHtml);
  console.log(`📄 Print HTML: ${CONFIG.guideDir}/print.html`);
}

// ==================== PDF GENERATOR ====================

async function buildPdf() {
  const printHtmlPath = path.resolve(path.join(CONFIG.guideDir, 'print.html'));
  const pdfPath = path.join(CONFIG.guideDir, 'supplier-portal-guide.pdf');

  if (!fs.existsSync(printHtmlPath)) {
    console.log('  ⚠ print.html not found — run guide generation first');
    return;
  }

  console.log('\n📝 Generating PDF…');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${printHtmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // let images/fonts load

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8px;color:#aaa;width:100%;text-align:center;font-family:sans-serif">Transfers.ma — Supplier Portal User Guide</div>`,
    footerTemplate: `<div style="font-size:8px;color:#aaa;width:100%;text-align:center;font-family:sans-serif">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });

  await browser.close();
  const sizeMb = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(1);
  console.log(`✅ PDF: ${pdfPath} (${sizeMb} MB)`);
}

// ==================== MAIN ====================

async function main() {
  const pdfOnly = process.env.PDF_ONLY === '1';
  const targetStep = process.env.STEP || null;

  if (pdfOnly) {
    buildHtmlGuide();
    await buildPdf();
    return;
  }

  const stepIds = Object.keys(STEPS);
  const stepsToRun = targetStep ? stepIds.filter(id => id === targetStep) : stepIds;

  if (stepsToRun.length === 0) {
    console.error(`Step "${targetStep}" not found. Available: ${stepIds.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🚀 Supplier Portal Tutorial Recorder`);
  console.log(`   Target: ${CONFIG.baseUrl}`);
  console.log(`   Steps: ${stepsToRun.join(', ')}\n`);

  for (const stepId of stepsToRun) {
    await runStep(stepId, STEPS[stepId]);
  }

  console.log('\n📚 Building guide…');
  buildHtmlGuide();
  await buildPdf();

  console.log('\n✅ Done!');
  console.log(`   HTML guide:  ${CONFIG.guideDir}/index.html`);
  console.log(`   PDF guide:   ${CONFIG.guideDir}/supplier-portal-guide.pdf`);
  console.log(`   Videos:      ${CONFIG.videosDir}/`);
  console.log(`   Screenshots: ${CONFIG.screenshotsDir}/`);
  console.log('\nNext steps:');
  console.log('  1. Review the guide in your browser: open supplier-guide/index.html');
  console.log('  2. When done, clean up production:');
  console.log('     python manage.py demo_supplier --teardown');
}

main().catch(console.error);
