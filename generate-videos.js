/**
 * TRANSFERS.MA TUTORIAL VIDEO GENERATOR
 * Records demo videos for each dashboard feature with real Morocco data.
 *
 * Usage:
 *   node generate-videos.js          # Run all steps
 *   STEP=1.1 node generate-videos.js # Run one step
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURATION ====================
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8000',
  credentials: {
    email: 'admin@transfers.ma',
    password: 'admin123',
  },
  videosDir: './demo-videos',
  authFile: './auth.json',
  viewport: { width: 1280, height: 720 },
  slowMo: 350,
};

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
    }, selector);
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
    console.log(`    ⚠ Could not click: ${description || selector} - ${e.message}`);
  }
}

async function typeSlowly(page, selector, text, description = '') {
  try {
    await page.waitForSelector(selector, { timeout: 8000 });
    await scrollToElement(page, selector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.style.outline = '3px solid #0d6efd';
        el.style.outlineOffset = '3px';
      }
    }, selector);
    await page.click(selector);
    await page.waitForTimeout(200);
    await page.fill(selector, '');
    for (const char of text) {
      await page.type(selector, char, { delay: 60 });
    }
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.style.outline = 'none';
    }, selector);
    await page.waitForTimeout(CONFIG.slowMo);
    console.log(`    ✓ Typed: ${description || text}`);
  } catch (e) {
    console.log(`    ⚠ Could not type: ${description || selector} - ${e.message}`);
  }
}

async function showCaption(page, text, duration = 2500) {
  await page.evaluate((t) => {
    let caption = document.getElementById('video-caption');
    if (!caption) {
      caption = document.createElement('div');
      caption.id = 'video-caption';
      caption.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 14px 28px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 18px;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 80%;
        text-align: center;
      `;
      document.body.appendChild(caption);
    }
    caption.textContent = t;
    caption.style.display = 'block';
  }, text);
  await page.waitForTimeout(duration);
  await page.evaluate(() => {
    const caption = document.getElementById('video-caption');
    if (caption) caption.style.display = 'none';
  });
}

async function navigateTo(page, urlPath) {
  await page.goto(`${CONFIG.baseUrl}/dashboard${urlPath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
}

async function clickNavLink(page, text) {
  try {
    await page.locator(`.sidebar-nav .nav-link:has(.nav-link-text:text("${text}"))`).first().click();
    await page.waitForTimeout(1500);
    console.log(`    ✓ Nav: ${text}`);
  } catch {
    console.log(`    ⚠ Nav link not found: ${text}`);
  }
}

async function selectOption(page, selector, value) {
  try {
    await page.selectOption(selector, value);
    await page.waitForTimeout(400);
    console.log(`    ✓ Selected: ${value}`);
  } catch (e) {
    console.log(`    ⚠ Could not select: ${selector} - ${e.message}`);
  }
}

// ==================== LOGIN / SESSION ====================

async function login(page) {
  console.log('  🔐 Logging in...');
  await page.goto(`${CONFIG.baseUrl}/dashboard/login/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[name="email"]', CONFIG.credentials.email);
  await page.fill('input[name="password"]', CONFIG.credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('  ✓ Logged in');
}

async function saveSession(context) {
  await context.storageState({ path: CONFIG.authFile });
  console.log('  💾 Session saved');
}

async function hasValidSession() {
  if (!fs.existsSync(CONFIG.authFile)) return false;
  const stats = fs.statSync(CONFIG.authFile);
  return Date.now() - stats.mtimeMs < 60 * 60 * 1000;
}

// ==================== VIDEO STEPS ====================

const STEPS = {
  // ========== 1. LOGIN & DASHBOARD ==========
  '1.1': {
    name: '01-login',
    title: 'Logging In to Dashboard',
    needsAuth: false,
    record: async (page) => {
      await page.goto(`${CONFIG.baseUrl}/dashboard/login/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      await showCaption(page, 'Welcome to Transfers.ma Dashboard');
      await typeSlowly(page, 'input[name="email"]', CONFIG.credentials.email, 'Email');

      await showCaption(page, 'Enter your password');
      await typeSlowly(page, 'input[name="password"]', CONFIG.credentials.password, 'Password');

      await showCaption(page, 'Click Sign In');
      await clickWithHighlight(page, 'button[type="submit"]', 'Sign In');

      await page.waitForTimeout(2500);
      await showCaption(page, 'Welcome to your Dashboard!');
      await page.waitForTimeout(2000);
    },
  },

  '1.2': {
    name: '02-dashboard-overview',
    title: 'Dashboard Overview',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Dashboard Home — Your business at a glance');
      await page.waitForTimeout(2000);
      await showCaption(page, 'Statistics cards show key metrics');
      await page.waitForTimeout(2000);
      await showCaption(page, 'Navigate features using the sidebar');
      await scrollDown(page, 300);
      await page.waitForTimeout(2000);
    },
  },

  // ========== 2. VEHICLE CATEGORIES ==========
  '2.1': {
    name: '03-vehicle-categories',
    title: 'Creating Vehicle Categories',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'First, set up Vehicle Categories');

      await clickNavLink(page, 'Vehicle Categories');
      await showCaption(page, 'Vehicle Categories — organize your fleet');
      await page.waitForTimeout(1500);

      const categories = [
        { name: 'Sedan', icon: 'bi bi-car-front' },
        { name: 'SUV', icon: 'bi bi-truck-front' },
        { name: 'Minivan', icon: 'bi bi-truck' },
        { name: 'Luxury', icon: 'bi bi-star-fill' },
        { name: 'Bus', icon: 'bi bi-bus-front-fill' },
      ];

      for (const cat of categories) {
        await showCaption(page, `Creating category: ${cat.name}`);

        // Go to create page
        await page.goto(`${CONFIG.baseUrl}/dashboard/vehicle-categories/create/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Fill name
        await typeSlowly(page, 'input[name="name"]', cat.name, 'Category name');

        // Click icon
        try {
          await page.click(`.icon-option[data-icon="${cat.icon}"]`);
          await page.waitForTimeout(500);
          console.log(`    ✓ Selected icon: ${cat.icon}`);
        } catch {
          console.log(`    ⚠ Icon not found: ${cat.icon}`);
        }

        // Submit
        await clickWithHighlight(page, 'button[type="submit"]', 'Create Category');
        await page.waitForTimeout(1500);
      }

      await showCaption(page, 'All vehicle categories created!');
      await page.waitForTimeout(2000);
    },
  },

  // ========== 3. ZONES ==========
  '3.1': {
    name: '04-zones',
    title: 'Creating Zones & Distance Ranges',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Now let\'s create Zones for pricing');

      await clickNavLink(page, 'Zones');
      await page.waitForTimeout(1000);
      await showCaption(page, 'Zones define areas where pickups/dropoffs happen');
      await page.waitForTimeout(1500);

      const zones = [
        { name: 'Marrakech', description: 'Marrakech city and surrounding areas', color: '#e74c3c', deposit: '20' },
        { name: 'Casablanca', description: 'Casablanca metropolitan area', color: '#3498db', deposit: '15' },
        { name: 'Agadir', description: 'Agadir coastal area', color: '#2ecc71', deposit: '25' },
      ];

      for (const zone of zones) {
        await showCaption(page, `Creating zone: ${zone.name}`);
        await page.goto(`${CONFIG.baseUrl}/dashboard/zones/create/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        await typeSlowly(page, '#name', zone.name, 'Zone name');
        await typeSlowly(page, '#description', zone.description, 'Description');

        // Set color
        await page.evaluate((c) => {
          const input = document.querySelector('#color');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, c);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, zone.color);
        await page.waitForTimeout(400);

        // Set deposit percentage
        if (zone.deposit) {
          await showCaption(page, `Setting ${zone.deposit}% deposit for ${zone.name}`);
          await page.fill('#deposit_percentage', zone.deposit);
          await page.waitForTimeout(400);
        }

        await clickWithHighlight(page, 'button[type="submit"]', 'Create Zone');
        await page.waitForTimeout(1500);
      }

      // Now add distance ranges to first zone (Marrakech)
      await showCaption(page, 'Now add distance ranges to Marrakech zone');
      await clickNavLink(page, 'Zones');
      await page.waitForTimeout(1000);

      // Click on first zone
      await page.locator('a.list-group-item, .card a, table tbody tr a').first().click();
      await page.waitForTimeout(1500);

      const ranges = [
        { name: 'City Center', min: '0', max: '10' },
        { name: 'Suburbs', min: '10', max: '25' },
        { name: 'Outskirts', min: '25', max: '50' },
      ];

      for (const range of ranges) {
        await showCaption(page, `Adding range: ${range.name} (${range.min}-${range.max} km)`);
        await scrollToElement(page, 'input[name="range_name"]');

        await page.fill('input[name="range_name"]', range.name);
        await page.waitForTimeout(300);
        await page.fill('input[name="min_km"]', range.min);
        await page.waitForTimeout(300);
        await page.fill('input[name="max_km"]', range.max);
        await page.waitForTimeout(300);

        // Click Add Range button
        await page.locator('button:has-text("Add Range"), button:has-text("Add Distance Range")').first().click();
        await page.waitForTimeout(1500);
      }

      await showCaption(page, 'Zone with distance ranges ready!');
      await page.waitForTimeout(2000);
    },
  },

  // ========== 4. ROUTES ==========
  '4.1': {
    name: '05-routes',
    title: 'Creating Transfer Routes',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Create Routes between cities');

      await clickNavLink(page, 'Routes');
      await page.waitForTimeout(1000);
      await showCaption(page, 'Routes define point-to-point transfer paths');
      await page.waitForTimeout(1500);

      const routes = [
        {
          name: 'Marrakech to Casablanca',
          origin: 'Marrakech',
          dest: 'Casablanca',
          origin_lat: '31.6295',
          origin_lng: '-7.9811',
          dest_lat: '33.5731',
          dest_lng: '-7.5898',
          deposit: '20',
        },
        {
          name: 'Marrakech to Essaouira',
          origin: 'Marrakech',
          dest: 'Essaouira',
          origin_lat: '31.6295',
          origin_lng: '-7.9811',
          dest_lat: '31.5085',
          dest_lng: '-9.7595',
          deposit: '15',
        },
        {
          name: 'Casablanca to Rabat',
          origin: 'Casablanca',
          dest: 'Rabat',
          origin_lat: '33.5731',
          origin_lng: '-7.5898',
          dest_lat: '34.0209',
          dest_lng: '-6.8416',
          deposit: '10',
        },
      ];

      for (const route of routes) {
        await showCaption(page, `Creating route: ${route.name}`);
        await page.goto(`${CONFIG.baseUrl}/dashboard/routes/create/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        await typeSlowly(page, '#name', route.name, 'Route name');

        // Fill origin
        await page.fill('#origin_name', route.origin);
        await page.waitForTimeout(300);
        await page.fill('#origin_latitude', route.origin_lat);
        await page.waitForTimeout(300);
        await page.fill('#origin_longitude', route.origin_lng);
        await page.waitForTimeout(300);

        // Fill destination
        await scrollDown(page, 200);
        await page.fill('#destination_name', route.dest);
        await page.waitForTimeout(300);
        await page.fill('#destination_latitude', route.dest_lat);
        await page.waitForTimeout(300);
        await page.fill('#destination_longitude', route.dest_lng);
        await page.waitForTimeout(500);

        // Set deposit percentage
        if (route.deposit) {
          await scrollToElement(page, '#deposit_percentage');
          await showCaption(page, `Setting ${route.deposit}% deposit for this route`);
          await page.fill('#deposit_percentage', route.deposit);
          await page.waitForTimeout(400);
        }

        await scrollToElement(page, 'button[type="submit"]');
        await clickWithHighlight(page, 'button[type="submit"]', 'Create Route');
        await page.waitForTimeout(1500);
      }

      await showCaption(page, 'All routes created!');
      await page.waitForTimeout(2000);
    },
  },

  // ========== 4b. PRICING SETUP (Zone Ranges + Route Zones + Vehicle Pricing) ==========
  '4.2': {
    name: '05b-pricing-setup',
    title: 'Zone Ranges, Route Zones & Vehicle Pricing',
    record: async (page) => {
      // ── PART 1: Add distance ranges to a zone ──
      await navigateTo(page, '/');
      await showCaption(page, 'Step 1: Add distance ranges to zones');
      await page.waitForTimeout(1500);

      await clickNavLink(page, 'Zones');
      await page.waitForTimeout(1000);
      await showCaption(page, 'Open a zone to configure its distance ranges');
      await page.waitForTimeout(1500);

      // Click first zone in the list
      try {
        await page.locator('table tbody tr a, a.list-group-item, .card a').first().click();
        await page.waitForTimeout(1500);
      } catch {
        console.log('    ⚠ Could not click zone link');
      }

      await showCaption(page, 'Zone detail — settings, map, deposit %, and distance ranges');
      await page.waitForTimeout(2000);

      // Scroll down to show the Distance Ranges section
      await page.evaluate(() => {
        const headers = document.querySelectorAll('.card-header h5, .card-header');
        for (const h of headers) {
          if (h.textContent.includes('Distance Ranges')) {
            h.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      });
      await page.waitForTimeout(1000);
      await showCaption(page, 'Distance ranges define pricing tiers (e.g. 0-10km, 10-25km)');
      await page.waitForTimeout(2000);

      // Add distance ranges via modal
      const ranges = [
        { name: 'City Center', min: '0', max: '10' },
        { name: 'Suburbs', min: '10', max: '25' },
        { name: 'Outskirts', min: '25', max: '50' },
      ];

      for (const range of ranges) {
        await showCaption(page, `Adding range: ${range.name} (${range.min}-${range.max} km)`);
        try {
          await page.locator('button[data-bs-target="#addRangeModal"]').first().click();
          await page.waitForTimeout(800);
        } catch {
          await page.locator('button:has-text("Add Range"), button:has-text("Add First Range")').first().click();
          await page.waitForTimeout(800);
        }

        await page.fill('#add_range_name', range.name);
        await page.waitForTimeout(300);
        await page.fill('#add_min_km', range.min);
        await page.waitForTimeout(300);
        await page.fill('#add_max_km', range.max);
        await page.waitForTimeout(300);

        await page.locator('#addRangeModal button[type="submit"]').click();
        await page.waitForTimeout(1500);
        console.log(`    ✓ Added range: ${range.name}`);
      }

      await showCaption(page, 'Distance ranges created for this zone!');
      await page.waitForTimeout(2000);

      // ── PART 2: Add pickup/dropoff zones to a route ──
      await showCaption(page, 'Step 2: Set up pickup & dropoff zones on a route');
      await page.waitForTimeout(1500);

      await clickNavLink(page, 'Routes');
      await page.waitForTimeout(1000);

      // Click first route (cards wrapped in a.text-decoration-none)
      try {
        await page.locator('.row a.text-decoration-none, .col-md-6 a, .col-lg-4 a').first().click();
        await page.waitForTimeout(1500);
        console.log('    ✓ Opened route detail');
      } catch {
        try {
          const href = await page.locator('a[href*="/routes/"]').first().getAttribute('href');
          if (href && href.includes('/routes/')) {
            await page.goto(`${CONFIG.baseUrl}${href}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1500);
            console.log('    ✓ Navigated to route detail');
          }
        } catch {
          console.log('    ⚠ Could not open route detail');
        }
      }

      await showCaption(page, 'Route detail — origin, destination, deposit %, and zone config');
      await page.waitForTimeout(2000);

      // Scroll to Pickup Zones section
      await page.evaluate(() => {
        const headers = document.querySelectorAll('.card-header h5, .card-header');
        for (const h of headers) {
          if (h.textContent.includes('Pickup Zones')) {
            h.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      });
      await page.waitForTimeout(1000);
      await showCaption(page, 'Pickup Zones — define where passengers can be picked up');
      await page.waitForTimeout(2000);

      // Add pickup zones
      const pickupZones = [
        { name: 'Airport Terminal', lat: '31.6069', lng: '-8.0363', radius: '3', color: '#28a745' },
        { name: 'Medina Area', lat: '31.6310', lng: '-7.9890', radius: '2', color: '#17a2b8' },
      ];

      for (const pz of pickupZones) {
        await showCaption(page, `Adding pickup zone: ${pz.name}`);
        try {
          await page.locator('button[data-bs-target="#addPickupZoneModal"]').click();
          await page.waitForTimeout(800);

          await page.fill('#pickup_zone_name', pz.name);
          await page.waitForTimeout(300);
          await page.fill('#pickup_lat', pz.lat);
          await page.waitForTimeout(300);
          await page.fill('#pickup_lng', pz.lng);
          await page.waitForTimeout(300);
          await page.fill('#pickup_radius', pz.radius);
          await page.waitForTimeout(300);

          // Set color
          await page.evaluate((c) => {
            const input = document.getElementById('pickup_color');
            if (input) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(input, c);
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, pz.color);
          await page.waitForTimeout(300);

          await page.locator('#addPickupZoneModal button[type="submit"]').click();
          await page.waitForTimeout(1500);
          console.log(`    ✓ Added pickup zone: ${pz.name}`);
        } catch (e) {
          console.log(`    ⚠ Pickup zone error: ${e.message}`);
        }
      }

      await showCaption(page, 'Pickup zones configured!');
      await page.waitForTimeout(1500);

      // Scroll to Dropoff Zones section
      await page.evaluate(() => {
        const headers = document.querySelectorAll('.card-header h5, .card-header');
        for (const h of headers) {
          if (h.textContent.includes('Dropoff Zones')) {
            h.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      });
      await page.waitForTimeout(1000);
      await showCaption(page, 'Dropoff Zones — define where passengers can be dropped off');
      await page.waitForTimeout(2000);

      // Add dropoff zones
      const dropoffZones = [
        { name: 'Casa Port Area', lat: '33.5950', lng: '-7.6187', radius: '4', color: '#dc3545' },
        { name: 'Casa City Center', lat: '33.5731', lng: '-7.5898', radius: '3', color: '#fd7e14' },
      ];

      for (const dz of dropoffZones) {
        await showCaption(page, `Adding dropoff zone: ${dz.name}`);
        try {
          await page.locator('button[data-bs-target="#addDropoffZoneModal"]').click();
          await page.waitForTimeout(800);

          await page.fill('#dropoff_zone_name', dz.name);
          await page.waitForTimeout(300);
          await page.fill('#dropoff_lat', dz.lat);
          await page.waitForTimeout(300);
          await page.fill('#dropoff_lng', dz.lng);
          await page.waitForTimeout(300);
          await page.fill('#dropoff_radius', dz.radius);
          await page.waitForTimeout(300);

          await page.evaluate((c) => {
            const input = document.getElementById('dropoff_color');
            if (input) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(input, c);
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, dz.color);
          await page.waitForTimeout(300);

          await page.locator('#addDropoffZoneModal button[type="submit"]').click();
          await page.waitForTimeout(1500);
          console.log(`    ✓ Added dropoff zone: ${dz.name}`);
        } catch (e) {
          console.log(`    ⚠ Dropoff zone error: ${e.message}`);
        }
      }

      await showCaption(page, 'Route now has pickup and dropoff zones defined!');
      await page.waitForTimeout(2000);

      // ── PART 3: Set up vehicle pricing ──
      await showCaption(page, 'Step 3: Set vehicle pricing for zones and routes');
      await page.waitForTimeout(1500);

      await clickNavLink(page, 'Transfer Vehicles');
      await page.waitForTimeout(1000);

      // Click first vehicle in the list
      try {
        await page.locator('.row a.text-decoration-none, .col-md-6 a, .col-lg-4 a').first().click();
        await page.waitForTimeout(1500);
        console.log('    ✓ Opened vehicle detail');
      } catch {
        try {
          const href = await page.locator('a[href*="transfer-vehicles/"]').first().getAttribute('href');
          if (href) {
            await page.goto(`${CONFIG.baseUrl}${href}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1500);
            console.log('    ✓ Navigated to vehicle detail');
          }
        } catch {
          console.log('    ⚠ Could not open vehicle detail');
        }
      }

      await showCaption(page, 'Vehicle detail — scroll down for Zone & Route pricing');
      await page.waitForTimeout(2000);

      // Scroll to Zone Pricing section
      await page.evaluate(() => {
        const headers = document.querySelectorAll('.card-header h5, .card-header');
        for (const h of headers) {
          if (h.textContent.includes('Zone Pricing')) {
            h.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      });
      await page.waitForTimeout(1000);
      await showCaption(page, 'Zone Pricing — set price per zone distance range');
      await page.waitForTimeout(2500);

      // Add zone pricing
      const zonePrices = [
        { price: '150', cost: '80' },
        { price: '300', cost: '160' },
        { price: '500', cost: '280' },
      ];

      for (let i = 0; i < zonePrices.length; i++) {
        try {
          const options = await page.$$eval('select[name="zone_distance_range"] option', (opts) =>
            opts.filter((o) => o.value).map((o) => ({ value: o.value, text: o.textContent.trim() }))
          );
          if (options.length > 0) {
            await page.selectOption('select[name="zone_distance_range"]', options[0].value);
            await page.waitForTimeout(300);
            console.log(`    ✓ Selected zone range: ${options[0].text}`);

            const priceInput = page.locator('form:has(select[name="zone_distance_range"]) input[name="price"]');
            const costInput = page.locator('form:has(select[name="zone_distance_range"]) input[name="cost"]');
            await priceInput.fill(zonePrices[i].price);
            await page.waitForTimeout(200);
            await costInput.fill(zonePrices[i].cost);
            await page.waitForTimeout(200);

            await showCaption(page, `Zone price: ${zonePrices[i].price} MAD (cost: ${zonePrices[i].cost})`);

            await page.locator('form:has(select[name="zone_distance_range"]) button[type="submit"]').click();
            await page.waitForTimeout(1500);
            console.log(`    ✓ Added zone pricing: ${zonePrices[i].price} MAD`);
          } else {
            break;
          }
        } catch (e) {
          console.log(`    ⚠ Zone pricing error: ${e.message}`);
          break;
        }
      }

      await showCaption(page, 'Zone pricing done! Now add route pricing');
      await page.waitForTimeout(2000);

      // Scroll to Route Pricing section
      await page.evaluate(() => {
        const headers = document.querySelectorAll('.card-header h5, .card-header');
        for (const h of headers) {
          if (h.textContent.includes('Route Pricing')) {
            h.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      });
      await page.waitForTimeout(1000);
      await showCaption(page, 'Route Pricing — fixed price per route for this vehicle');
      await page.waitForTimeout(2500);

      // Add route pricing
      const routePrices = [
        { price: '2500', cost: '1500' },
        { price: '1800', cost: '1000' },
        { price: '800', cost: '450' },
      ];

      for (let i = 0; i < routePrices.length; i++) {
        try {
          const options = await page.$$eval('select[name="route_id"] option', (opts) =>
            opts.filter((o) => o.value).map((o) => ({ value: o.value, text: o.textContent.trim() }))
          );
          if (options.length > 0) {
            await page.selectOption('select[name="route_id"]', options[0].value);
            await page.waitForTimeout(300);
            console.log(`    ✓ Selected route: ${options[0].text}`);

            const priceInput = page.locator('form:has(select[name="route_id"]) input[name="price"]');
            const costInput = page.locator('form:has(select[name="route_id"]) input[name="cost"]');
            await priceInput.fill(routePrices[i].price);
            await page.waitForTimeout(200);
            await costInput.fill(routePrices[i].cost);
            await page.waitForTimeout(200);

            await showCaption(page, `Route price: ${routePrices[i].price} MAD (cost: ${routePrices[i].cost})`);

            await page.locator('form:has(select[name="route_id"]) button[type="submit"]').click();
            await page.waitForTimeout(1500);
            console.log(`    ✓ Added route pricing: ${routePrices[i].price} MAD`);
          } else {
            break;
          }
        } catch (e) {
          console.log(`    ⚠ Route pricing error: ${e.message}`);
          break;
        }
      }

      await showCaption(page, 'Vehicle fully priced for all zones and routes!');
      await page.waitForTimeout(2000);

      await showCaption(page, 'Flow: Zone Ranges → Route Pickup/Dropoff Zones → Vehicle Pricing');
      await page.waitForTimeout(3000);
    },
  },

  // ========== 5. TRANSFER VEHICLES ==========
  '5.1': {
    name: '06-transfer-vehicles',
    title: 'Adding Transfer Vehicles',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Add vehicles for transfer service');

      await clickNavLink(page, 'Transfer Vehicles');
      await page.waitForTimeout(1000);
      await showCaption(page, 'Transfer Vehicles — your fleet for A-to-B transfers');
      await page.waitForTimeout(1500);

      const vehicles = [
        { name: 'Mercedes E-Class', passengers: '4', luggage: '3', category: 'Sedan', supplier: 'Atlas Transport' },
        { name: 'Toyota Fortuner', passengers: '6', luggage: '4', category: 'SUV', supplier: 'Sahara Mobility' },
        { name: 'Mercedes Vito', passengers: '7', luggage: '7', category: 'Minivan', supplier: 'Royal Transfers' },
        { name: 'Mercedes S-Class', passengers: '3', luggage: '2', category: 'Luxury', supplier: 'Premium Cars MA' },
        { name: 'Volvo 9700 Coach', passengers: '45', luggage: '45', category: 'Bus', supplier: 'National Express' },
      ];

      for (const v of vehicles) {
        await showCaption(page, `Adding: ${v.name}`);
        await page.goto(`${CONFIG.baseUrl}/dashboard/transfer-vehicles/create/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        // Select category by visible text
        try {
          const options = await page.$$eval('select[name="category"] option', (opts) =>
            opts.map((o) => ({ value: o.value, text: o.textContent.trim() }))
          );
          const match = options.find((o) => o.text.toLowerCase().includes(v.category.toLowerCase()));
          if (match) {
            await page.selectOption('select[name="category"]', match.value);
            await page.waitForTimeout(300);
          }
        } catch {
          console.log(`    ⚠ Could not select category: ${v.category}`);
        }

        await typeSlowly(page, 'input[name="name"]', v.name, 'Vehicle name');
        await page.fill('input[name="passengers"]', v.passengers);
        await page.waitForTimeout(200);
        await page.fill('input[name="luggage"]', v.luggage);
        await page.waitForTimeout(200);

        await scrollDown(page, 200);
        await page.fill('input[name="supplier_name"]', v.supplier);
        await page.waitForTimeout(300);

        await scrollToElement(page, 'button[type="submit"]');
        await clickWithHighlight(page, 'button[type="submit"]', 'Save Vehicle');
        await page.waitForTimeout(1500);
      }

      // Return to list
      await clickNavLink(page, 'Transfer Vehicles');
      await page.waitForTimeout(1000);
      await showCaption(page, 'All transfer vehicles added!');
      await page.waitForTimeout(2000);
    },
  },

  // ========== 6. RENTAL VEHICLES ==========
  '6.1': {
    name: '07-rental-vehicles',
    title: 'Adding Rental Vehicles',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Now add vehicles for the rental service');
      await page.waitForTimeout(1500);

      // Navigate to rental vehicles via URL
      await page.goto(`${CONFIG.baseUrl}/dashboard/rental-vehicles/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await showCaption(page, 'Rental Vehicles — your car rental fleet');
      await page.waitForTimeout(1500);

      const rentals = [
        { name: 'Dacia Logan', passengers: '5', luggage: '3', category: 'Sedan', daily: '250', weekly: '1500' },
        { name: 'Renault Clio', passengers: '5', luggage: '2', category: 'Sedan', daily: '200', weekly: '1200' },
        { name: 'Hyundai Tucson', passengers: '5', luggage: '4', category: 'SUV', daily: '450', weekly: '2800' },
        { name: 'Kia Carnival', passengers: '8', luggage: '6', category: 'Minivan', daily: '600', weekly: '3500' },
      ];

      for (const v of rentals) {
        await showCaption(page, `Adding rental car: ${v.name}`);
        await page.goto(`${CONFIG.baseUrl}/dashboard/rental-vehicles/create/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        // Select category
        try {
          const options = await page.$$eval('select[name="category"] option', (opts) =>
            opts.map((o) => ({ value: o.value, text: o.textContent.trim() }))
          );
          const match = options.find((o) => o.text.toLowerCase().includes(v.category.toLowerCase()));
          if (match) {
            await page.selectOption('select[name="category"]', match.value);
            await page.waitForTimeout(300);
          }
        } catch {
          console.log(`    ⚠ Could not select category: ${v.category}`);
        }

        await typeSlowly(page, 'input[name="name"]', v.name, 'Vehicle name');
        await page.fill('input[name="passengers"]', v.passengers);
        await page.waitForTimeout(200);
        await page.fill('input[name="luggage"]', v.luggage);
        await page.waitForTimeout(200);

        // Rental pricing
        await scrollDown(page, 200);
        try {
          await page.fill('input[name="daily_rate"]', v.daily);
          await page.waitForTimeout(200);
          await page.fill('input[name="weekly_rate"]', v.weekly);
          await page.waitForTimeout(300);
        } catch {
          console.log('    ⚠ Rental rate fields not found');
        }

        await scrollToElement(page, 'button[type="submit"]');
        await clickWithHighlight(page, 'button[type="submit"]', 'Save Rental Car');
        await page.waitForTimeout(1500);
      }

      await page.goto(`${CONFIG.baseUrl}/dashboard/rental-vehicles/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await showCaption(page, 'All rental vehicles added!');
      await page.waitForTimeout(2000);
    },
  },

  // ========== 7. TOURS ==========
  '7.1': {
    name: '08-create-tour',
    title: 'Creating a Tour',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Create a Tour / Day Trip');

      await clickNavLink(page, 'Tours');
      await page.waitForTimeout(1000);
      await showCaption(page, 'Tours — excursions and day trips you offer');
      await page.waitForTimeout(1500);

      // Go to create page
      await page.goto(`${CONFIG.baseUrl}/dashboard/trips/create/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Basic Info
      await showCaption(page, 'Fill in the tour details');
      await typeSlowly(page, 'input[name="name"]', 'Sahara Desert Experience - 3 Days', 'Tour title');
      await page.waitForTimeout(500);

      // Try to fill departure location
      try {
        await page.fill('input[name="departure_location"]', 'Marrakech');
        await page.waitForTimeout(300);
      } catch {}

      // Trip type
      try {
        await page.click('input[name="trip_type"][value="multi_day"]');
        await page.waitForTimeout(300);
      } catch {}

      // Duration
      try {
        await page.fill('input[name="duration_days"]', '3');
        await page.waitForTimeout(300);
      } catch {}

      await scrollDown(page, 300);
      await page.waitForTimeout(500);

      // Short description
      await showCaption(page, 'Add a compelling description');
      try {
        await page.fill(
          'textarea[name="short_description"]',
          'Experience the magic of the Sahara Desert on this unforgettable 3-day journey from Marrakech through the Atlas Mountains to the golden dunes of Merzouga.'
        );
        await page.waitForTimeout(500);
      } catch {}

      // Full description
      try {
        await page.fill(
          'textarea[name="description"]',
          'Journey from Marrakech through the High Atlas Mountains, past ancient kasbahs, and into the vast Sahara Desert. Ride camels at sunset, sleep under the stars in a luxury desert camp, and explore the breathtaking landscapes of southern Morocco. This tour includes all meals, comfortable 4x4 transport, and experienced English-speaking guides.'
        );
        await page.waitForTimeout(500);
      } catch {}

      await scrollDown(page, 300);
      await page.waitForTimeout(500);

      // Pricing
      await showCaption(page, 'Set pricing for the tour');
      try {
        await page.click('input[name="pricing_model"][value="per_person"]');
        await page.waitForTimeout(300);
        await page.fill('input[name="price_per_person"]', '2500');
        await page.waitForTimeout(300);
        await page.fill('input[name="child_price"]', '1500');
        await page.waitForTimeout(300);
        await page.fill('input[name="private_tour_price"]', '8000');
        await page.waitForTimeout(300);
      } catch {
        console.log('    ⚠ Pricing fields not found');
      }

      await scrollDown(page, 300);
      await page.waitForTimeout(500);

      // Inclusions & Exclusions
      await showCaption(page, 'Specify what\'s included and excluded');
      try {
        await page.fill(
          'textarea[name="inclusions"]',
          'Hotel pickup and drop-off\nAll transport in 4x4\nAccommodation (2 nights)\nAll meals (breakfast, lunch, dinner)\nCamel trek\nDesert camp experience\nEnglish-speaking guide'
        );
        await page.waitForTimeout(400);
      } catch {}

      try {
        await page.fill('textarea[name="exclusions"]', 'Travel insurance\nPersonal expenses\nTips and gratuities\nDrinks during meals');
        await page.waitForTimeout(400);
      } catch {}

      await scrollDown(page, 300);
      await page.waitForTimeout(500);

      // Cancellation policy
      await showCaption(page, 'Set cancellation policy');
      try {
        await page.selectOption('select[name="cancellation_policy"]', 'moderate');
        await page.waitForTimeout(300);
      } catch {}

      // Status
      try {
        await page.selectOption('select[name="status"]', 'published');
        await page.waitForTimeout(300);
      } catch {}

      await scrollToElement(page, 'button[type="submit"]');
      await showCaption(page, 'Save the tour');
      await clickWithHighlight(page, 'button[type="submit"]', 'Create Tour');
      await page.waitForTimeout(2000);

      await showCaption(page, 'Tour created successfully!');
      await page.waitForTimeout(2000);
    },
  },

  '7.2': {
    name: '09-tour-preview',
    title: 'Tour Preview',
    record: async (page) => {
      await navigateTo(page, '/trips/');
      await showCaption(page, 'View your tours list');
      await page.waitForTimeout(1500);

      // Click on first tour
      await showCaption(page, 'Click on a tour to see its details');
      try {
        await page.locator('.card a, table tbody tr a, .list-group-item').first().click();
        await page.waitForTimeout(1500);
      } catch {}

      await showCaption(page, 'Tour detail page with all information');
      await scrollDown(page, 300);
      await page.waitForTimeout(1500);

      // Try clicking preview button
      await showCaption(page, 'Click Preview to see the customer view');
      try {
        await page.locator('a:has-text("Preview")').first().click();
        await page.waitForTimeout(2500);
      } catch {
        console.log('    ⚠ Preview button not found');
      }

      await showCaption(page, 'This is how customers will see the tour!');
      await scrollDown(page, 400);
      await page.waitForTimeout(2000);
      await scrollDown(page, 400);
      await page.waitForTimeout(2000);
    },
  },

  // ========== 8. SETTINGS ==========
  '8.1': {
    name: '10-settings',
    title: 'System Settings',
    record: async (page) => {
      await navigateTo(page, '/settings/');
      await showCaption(page, 'Configure your system settings');
      await page.waitForTimeout(1500);

      await showCaption(page, 'Set your company name, email, and phone');
      await page.waitForTimeout(2000);

      await scrollDown(page, 300);
      await showCaption(page, 'Configure currency and cost settings');
      await page.waitForTimeout(2000);

      await scrollDown(page, 300);
      await showCaption(page, 'Add your Stripe payment keys for online payments');
      await page.waitForTimeout(2000);

      await scrollDown(page, 300);
      await showCaption(page, 'Add Google Maps API key for route mapping');
      await page.waitForTimeout(2000);
    },
  },

  // ========== 9. BROWSING FEATURES ==========
  '9.1': {
    name: '11-transfers-list',
    title: 'Viewing Transfers',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'View transfer bookings');

      await clickNavLink(page, 'Transfers');
      await page.waitForTimeout(1500);
      await showCaption(page, 'Transfer bookings appear here when customers book');
      await page.waitForTimeout(2000);
      await showCaption(page, 'You can filter by status and search');
      await page.waitForTimeout(2000);
    },
  },

  '9.2': {
    name: '12-users',
    title: 'User Management',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Manage your users');

      await clickNavLink(page, 'Users');
      await page.waitForTimeout(1500);
      await showCaption(page, 'View all registered users');
      await page.waitForTimeout(2000);
      await showCaption(page, 'Filter by role: Admin, Manager, Driver, Client');
      await page.waitForTimeout(2000);
    },
  },

  '9.3': {
    name: '13-payments',
    title: 'Payments Overview',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'Track all payments');

      await clickNavLink(page, 'Payments');
      await page.waitForTimeout(1500);
      await showCaption(page, 'All payment transactions listed here');
      await page.waitForTimeout(2000);
      await showCaption(page, 'Stripe integration handles online payments');
      await page.waitForTimeout(2000);
    },
  },

  '9.4': {
    name: '14-reports',
    title: 'Reports & Analytics',
    record: async (page) => {
      await navigateTo(page, '/');
      await showCaption(page, 'View business reports');

      await clickNavLink(page, 'Reports');
      await page.waitForTimeout(1500);
      await showCaption(page, 'Revenue reports and analytics');
      await page.waitForTimeout(2000);
      await scrollDown(page, 300);
      await showCaption(page, 'Track performance by service type');
      await page.waitForTimeout(2000);
    },
  },
};

// ==================== RUNNER ====================

async function runStep(stepId, step, browser) {
  const videoDir = path.resolve(CONFIG.videosDir, step.name);
  fs.mkdirSync(videoDir, { recursive: true });

  const contextOpts = {
    viewport: CONFIG.viewport,
    recordVideo: {
      dir: videoDir,
      size: CONFIG.viewport,
    },
  };

  // Load saved auth unless step manages its own login
  if (step.needsAuth !== false && fs.existsSync(CONFIG.authFile)) {
    contextOpts.storageState = CONFIG.authFile;
  }

  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();

  try {
    // If step needs auth but no saved session, login first
    if (step.needsAuth !== false && !fs.existsSync(CONFIG.authFile)) {
      await login(page);
      await saveSession(context);
    }

    await step.record(page);

    // Save session after login step
    if (step.needsAuth === false && stepId === '1.1') {
      await saveSession(context);
    }
  } catch (e) {
    console.error(`  ✗ Error in ${step.name}: ${e.message}`);
  }

  await page.close();
  await context.close();

  // Find and rename the video file
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = path.join(videoDir, files[0]);
    const dest = path.join(CONFIG.videosDir, `${step.name}.webm`);
    fs.renameSync(src, dest);
    fs.rmdirSync(videoDir, { recursive: true });
    console.log(`  📁 Saved: ${dest}`);
    return dest;
  }
  return null;
}

async function main() {
  fs.mkdirSync(CONFIG.videosDir, { recursive: true });

  const targetStep = process.env.STEP;
  const stepEntries = Object.entries(STEPS);

  console.log(`\n🎬 Transfers.ma Video Generator`);
  console.log(`   Base URL: ${CONFIG.baseUrl}`);
  console.log(`   Steps: ${targetStep || 'ALL'}\n`);

  const browser = await chromium.launch({ headless: false, slowMo: 100 });

  const results = [];
  for (const [id, step] of stepEntries) {
    if (targetStep && id !== targetStep) continue;

    console.log(`\n📹 [${id}] ${step.title}`);
    const videoPath = await runStep(id, step, browser);
    results.push({ id, ...step, videoPath });
  }

  await browser.close();

  // Generate HTML guide
  generateHTMLGuide(results);

  console.log(`\n✅ Done! Open demo-videos/guide.html to view.`);
}

// ==================== HTML GUIDE GENERATOR ====================

function generateHTMLGuide(results) {
  const sections = [
    { title: 'Getting Started', steps: ['1.1', '1.2'] },
    { title: 'Vehicle Categories', steps: ['2.1'] },
    { title: 'Zones & Pricing Areas', steps: ['3.1'] },
    { title: 'Transfer Routes', steps: ['4.1'] },
    { title: 'Pricing Setup', steps: ['4.2'] },
    { title: 'Transfer Vehicles', steps: ['5.1'] },
    { title: 'Rental Vehicles', steps: ['6.1'] },
    { title: 'Tours & Day Trips', steps: ['7.1', '7.2'] },
    { title: 'Settings', steps: ['8.1'] },
    { title: 'Bookings & Reports', steps: ['9.1', '9.2', '9.3', '9.4'] },
  ];

  const guideContent = {
    '1.1': {
      description: 'Log in to your Transfers.ma dashboard using your admin email and password.',
      tips: [
        'The dashboard is accessed at <code>/dashboard/login/</code>',
        'Default credentials: <strong>admin@transfers.ma</strong> / <strong>admin123</strong>',
        'Your session stays active until you explicitly log out',
      ],
    },
    '1.2': {
      description: 'The dashboard home page gives you an overview of your business metrics at a glance.',
      tips: [
        'Statistics cards show transfer, rental, and tour counts',
        'Use the sidebar to navigate between all features',
        'The sidebar can be collapsed for more screen space',
      ],
    },
    '2.1': {
      description:
        'Vehicle categories help organize your fleet (Sedan, SUV, Minivan, etc). Categories must be created before adding vehicles.',
      tips: [
        'Each category has an icon for visual identification',
        'Categories are shared between transfer and rental vehicles',
        'You can set default passenger and luggage capacity per category',
        'Inactive categories won\'t appear in vehicle forms',
      ],
    },
    '3.1': {
      description:
        'Zones define geographic areas for distance-based pricing. Each zone can have multiple distance ranges with different prices, and a deposit percentage for bookings.',
      tips: [
        'Create zones for each city or area you operate in',
        'Add distance ranges (e.g., 0-10 km, 10-25 km) after creating the zone',
        'Distance ranges are used to calculate transfer prices based on trip distance',
        'Set a <strong>deposit percentage</strong> to require upfront payment for bookings in this zone',
        'Each zone has a color for visual identification on maps',
      ],
    },
    '4.1': {
      description:
        'Routes define fixed-price transfers between two cities. Each route has an origin and destination with coordinates, and a deposit percentage.',
      tips: [
        'Routes support Google Maps autocomplete if API key is configured',
        'Set pickup and dropoff radius to define the service area around each city',
        'Distance and duration are auto-calculated from coordinates',
        'Set a <strong>deposit percentage</strong> to require upfront payment for bookings on this route',
        'Routes can be bidirectional (A→B and B→A)',
      ],
    },
    '4.2': {
      description:
        'This video covers the complete pricing setup: adding distance ranges to zones, configuring pickup and dropoff zones on routes, and setting per-vehicle pricing for both zones and routes.',
      tips: [
        '<strong>Zone Distance Ranges:</strong> Open a zone → Add Range modal → set name, min/max km',
        '<strong>Route Pickup Zones:</strong> Open a route → Pickup Zones → Add Zone with name, coordinates, radius',
        '<strong>Route Dropoff Zones:</strong> Same as pickup, but defines where passengers are dropped off',
        '<strong>Vehicle Zone Pricing:</strong> Open a vehicle → Zone Pricing → select range, set price & cost',
        '<strong>Vehicle Route Pricing:</strong> Vehicle → Route Pricing → select route, set fixed price & cost',
        'Deposit percentage is set on the zone or route, not on individual vehicles',
      ],
    },
    '5.1': {
      description:
        'Transfer vehicles are used for airport pickups and city-to-city transfers. Each vehicle has zone and route pricing. Deposit is configured at the zone/route level.',
      tips: [
        'You must create categories, zones, and routes first',
        'Set different prices for each zone distance range',
        'Set specific prices for each route',
        'Deposit percentage is set on zones and routes, not on individual vehicles',
        'You can upload a photo of each vehicle',
        'Track supplier information for outsourced vehicles',
      ],
    },
    '6.1': {
      description: 'Rental vehicles are available for daily/weekly car rental. Set daily and weekly rates for each vehicle.',
      tips: [
        'Daily and weekly rates are set per vehicle',
        'The deposit is auto-calculated as 3x daily rate',
        'Rental availability is tracked to prevent double-booking',
        'You can manage rental statuses (pending, confirmed, active, completed)',
      ],
    },
    '7.1': {
      description:
        'Create tours and day trips with detailed itineraries, pricing, and policies. Tours can be published for customer booking.',
      tips: [
        'Tours support multiple pricing models: per person, tiered, or private',
        'Add highlights, itinerary stops, FAQs, and content blocks',
        'Upload a featured image and gallery photos',
        'Set cancellation policies and booking requirements',
        'SEO fields help with search engine visibility',
      ],
    },
    '7.2': {
      description: 'Preview tours to see exactly how customers will view them before publishing.',
      tips: [
        'The preview shows the full customer-facing layout',
        'Check all sections: hero, highlights, gallery, itinerary, pricing, FAQs',
        'Share the preview link with your team for review',
      ],
    },
    '8.1': {
      description: 'Configure system-wide settings including company info, currency, API keys, and payment integration.',
      tips: [
        'Set your default currency (MAD, EUR, USD, GBP)',
        'Add Stripe keys to enable online payments',
        'Add Google Maps API key for route mapping and autocomplete',
        'Company info appears on booking confirmations',
      ],
    },
    '9.1': {
      description: 'View and manage all transfer bookings. Update status and assign drivers.',
      tips: [
        'Transfers flow through: Pending → Confirmed → Assigned → In Transit → Completed',
        'Assign a driver and vehicle to each transfer',
        'Filter by status to find pending bookings quickly',
      ],
    },
    '9.2': {
      description: 'View all registered users. Filter by role to find admins, drivers, or clients.',
      tips: [
        'User roles: Admin, Manager, Driver, Client',
        'Search by name or email',
        'Drivers can be assigned to transfers',
      ],
    },
    '9.3': {
      description: 'Track all payment transactions processed through Stripe.',
      tips: [
        'Payments are linked to bookings (transfers, rentals, tours)',
        'View payment status, amount, and Stripe payment ID',
        'Stripe webhook handles automatic payment confirmation',
      ],
    },
    '9.4': {
      description: 'View revenue reports and business analytics.',
      tips: [
        'See revenue breakdown by service type',
        'Track top-performing routes and tours',
        'Monitor booking trends over time',
      ],
    },
  };

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transfers.ma - User Guide</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        :root { --primary: #0d6efd; }
        body { background: #f4f6f9; }
        .hero {
            background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 50%, #084298 100%);
            color: white;
            padding: 3rem 0;
        }
        .section-header {
            background: white;
            padding: 1.5rem 2rem;
            border-radius: 1rem;
            margin-bottom: 1.5rem;
            border-left: 4px solid var(--primary);
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .guide-card {
            background: white;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
            transition: transform 0.2s;
        }
        .guide-card:hover { transform: translateY(-2px); }
        .guide-card video {
            width: 100%;
            border-bottom: 1px solid #eee;
            background: #000;
        }
        .guide-card .card-body { padding: 1.5rem 2rem; }
        .guide-card h5 { color: #212529; font-weight: 700; }
        .tip-list { padding-left: 0; list-style: none; }
        .tip-list li {
            padding: 0.5rem 0 0.5rem 1.5rem;
            position: relative;
            border-bottom: 1px solid #f0f0f0;
        }
        .tip-list li:last-child { border-bottom: none; }
        .tip-list li::before {
            content: "\\F26A";
            font-family: "bootstrap-icons";
            position: absolute;
            left: 0;
            color: var(--primary);
        }
        .badge-step {
            background: var(--primary);
            color: white;
            font-size: 0.75rem;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
        }
        .toc a {
            color: #495057;
            text-decoration: none;
            padding: 0.5rem 1rem;
            display: block;
            border-radius: 0.5rem;
            transition: all 0.2s;
        }
        .toc a:hover { background: #e9ecef; color: var(--primary); }
        .no-video {
            background: #f8f9fa;
            padding: 3rem;
            text-align: center;
            color: #6c757d;
        }
        @media (max-width: 768px) {
            .guide-card .card-body { padding: 1rem; }
        }
    </style>
</head>
<body>
    <div class="hero">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1 class="display-5 fw-bold"><i class="bi bi-car-front me-3"></i>Transfers.ma</h1>
                    <p class="lead mb-0">Complete User Guide with Video Tutorials</p>
                    <p class="opacity-75 mt-2">Follow along step-by-step to set up and manage your transfer business</p>
                </div>
                <div class="col-md-4 text-end">
                    <span class="badge bg-light text-dark fs-6">${Object.keys(STEPS).length} Tutorials</span>
                </div>
            </div>
        </div>
    </div>

    <div class="container py-5">
        <div class="row">
            <!-- Table of Contents -->
            <div class="col-lg-3 mb-4">
                <div class="position-sticky" style="top: 1rem;">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white fw-bold">
                            <i class="bi bi-list-ul me-2"></i>Contents
                        </div>
                        <div class="card-body toc p-2">
`;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    html += `                            <a href="#section-${si}"><strong>${si + 1}.</strong> ${section.title}</a>\n`;
  }

  html += `                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mt-3">
                        <div class="card-body">
                            <h6><i class="bi bi-info-circle me-2"></i>Setup Order</h6>
                            <ol class="small text-muted ps-3 mb-0">
                                <li>Login</li>
                                <li>Vehicle Categories</li>
                                <li>Zones & Ranges</li>
                                <li>Routes</li>
                                <li>Transfer Vehicles</li>
                                <li>Rental Vehicles</li>
                                <li>Tours</li>
                                <li>Settings</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="col-lg-9">
`;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    html += `
                <div id="section-${si}" class="section-header">
                    <h3 class="mb-0"><span class="text-primary">${si + 1}.</span> ${section.title}</h3>
                </div>
`;

    for (const stepId of section.steps) {
      const step = STEPS[stepId];
      const guide = guideContent[stepId] || { description: '', tips: [] };
      const videoFile = `${step.name}.webm`;
      const hasVideo = fs.existsSync(path.join(CONFIG.videosDir, videoFile));

      html += `
                <div class="guide-card">
                    <div class="card-body pb-2">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="badge-step">${stepId}</span>
                            <h5 class="mb-0">${step.title}</h5>
                        </div>
                        <p class="text-muted">${guide.description}</p>
                    </div>
                    ${
                      hasVideo
                        ? `<video controls preload="metadata"><source src="${videoFile}" type="video/webm">Your browser does not support video.</video>`
                        : `<div class="no-video"><i class="bi bi-camera-video" style="font-size:2rem"></i><p class="mt-2 mb-0">Video will appear here after generation</p></div>`
                    }
                    ${
                      guide.tips.length
                        ? `<div class="card-body pt-2">
                        <h6 class="text-primary"><i class="bi bi-lightbulb me-2"></i>Tips</h6>
                        <ul class="tip-list mb-0">
                            ${guide.tips.map((t) => `<li>${t}</li>`).join('\n                            ')}
                        </ul>
                    </div>`
                        : ''
                    }
                </div>
`;
    }
  }

  html += `
            </div>
        </div>

        <div class="text-center text-muted py-4">
            <small>Generated by Transfers.ma Video Guide | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</small>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

  const guidePath = path.join(CONFIG.videosDir, 'index.html');
  fs.writeFileSync(guidePath, html);
  console.log(`\n📄 Guide: ${guidePath}`);
}

main().catch(console.error);
