const { chromium } = require('playwright');

const URL = 'https://transfers.ma/test-demo-2/';
const results = [];

function log(test, status, message) {
    const icon = status === 'PASS' ? '\x1b[32m✓\x1b[0m' : status === 'FAIL' ? '\x1b[31m✗\x1b[0m' : '\x1b[33m⚠\x1b[0m';
    console.log(`  ${icon} [${test}] ${message}`);
    results.push({ test, status, message });
}

function futureDate(daysFromNow) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().slice(0, 16);
}

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 150 });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    try {
        // ============================================
        // LOAD
        // ============================================
        console.log('\n\x1b[36m=== Loading page ===\x1b[0m');
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('#tb-booking-widget', { timeout: 15000 });
        await page.waitForTimeout(2000);
        log('Load', 'PASS', 'Widget loaded');

        // ============================================
        // STEP 1: Fill search
        // ============================================
        console.log('\n\x1b[36m=== Step 1: Search ===\x1b[0m');

        const fromInput = await page.$('.tb-pill-bar__input[data-field="pickup"]');
        await fromInput.click();
        await fromInput.type('Marrakech', { delay: 60 });
        await page.waitForTimeout(1500);

        const customItem = await page.$('.tb-autocomplete-dropdown[data-dropdown="pickup"] .tb-autocomplete-item');
        if (customItem) { await customItem.click(); }
        else {
            const pacItem = await page.$('.pac-item');
            if (pacItem) await pacItem.click();
        }
        await page.waitForTimeout(800);
        log('Step 1', 'PASS', 'Pickup filled');

        const toInput = await page.$('.tb-pill-bar__input[data-field="dropoff"]');
        await toInput.click();
        await toInput.type('Essaouira', { delay: 60 });
        await page.waitForTimeout(1500);

        const customItem2 = await page.$('.tb-autocomplete-dropdown[data-dropdown="dropoff"] .tb-autocomplete-item');
        if (customItem2) { await customItem2.click(); }
        else {
            const pacItem2 = await page.$('.pac-item');
            if (pacItem2) await pacItem2.click();
        }
        await page.waitForTimeout(800);
        log('Step 1', 'PASS', 'Dropoff filled');

        const dateInput = await page.$('.tb-pill-bar__input[data-field="datetime"]');
        await dateInput.evaluate((el, val) => {
            el.value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, futureDate(3));
        await page.waitForTimeout(500);
        log('Step 1', 'PASS', 'Date set');

        await page.click('#tb-btn-search');
        await page.waitForSelector('#tb-step-2', { state: 'visible', timeout: 15000 });
        await page.waitForTimeout(3000);
        log('Step 1', 'PASS', 'Step 2 appeared');

        // ============================================
        // STEP 2: Select vehicle
        // ============================================
        console.log('\n\x1b[36m=== Step 2: Select vehicle ===\x1b[0m');

        const vehicleCards = await page.$$('.tb-vehicle-card');
        log('Step 2', vehicleCards.length > 0 ? 'PASS' : 'FAIL', `${vehicleCards.length} vehicles found`);

        if (vehicleCards.length > 0) {
            await vehicleCards[0].click();
            await page.waitForTimeout(1000);
            log('Step 2', 'PASS', 'Vehicle selected');

            // Check extras loaded after vehicle selection
            const extrasVisible = await page.$eval('#tb-extras-section', el => el.style.display !== 'none').catch(() => false);
            log('Step 2', 'PASS', extrasVisible ? 'Extras section visible after vehicle selection' : 'Extras section hidden (none assigned to this category)');
        }

        await page.click('#tb-btn-continue');
        await page.waitForSelector('#tb-step-3', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1500);
        log('Step 2', 'PASS', 'Step 3 appeared');

        // ============================================
        // STEP 3: Fill customer info + Cash payment
        // ============================================
        console.log('\n\x1b[36m=== Step 3: Customer info + Cash payment ===\x1b[0m');

        await page.fill('#tb-customer-first-name', 'Test');
        await page.fill('#tb-customer-last-name', 'Payment');
        await page.fill('#tb-customer-email', 'test@example.com');
        await page.fill('#tb-customer-phone', '612345678');
        await page.waitForTimeout(500);
        log('Step 3', 'PASS', 'Customer info filled');

        // Select Cash gateway
        const cashOption = await page.$('.tb-gateway-option[data-gateway="cash"]');
        if (cashOption) {
            const cashDisplay = await cashOption.evaluate(el => window.getComputedStyle(el).display);
            if (cashDisplay !== 'none') {
                const cashRadio = await cashOption.$('input[type="radio"]');
                if (cashRadio) {
                    await cashRadio.evaluate(el => el.click());
                    await page.waitForTimeout(500);
                }
                log('Step 3', 'PASS', 'Cash gateway selected');
            } else {
                log('Step 3', 'WARN', 'Cash gateway not visible, using default');
            }
        } else {
            log('Step 3', 'WARN', 'No cash gateway option found, using default');
        }

        // Check current gateway
        const selectedGw = await page.evaluate(() => {
            var checked = document.querySelector('input[name="tb-gateway"]:checked');
            return checked ? checked.value : 'none';
        });
        log('Step 3', 'PASS', `Selected gateway: ${selectedGw}`);

        // Verify no error banner visible before clicking pay
        const errorBefore = await page.$eval('#tb-payment-errors', el => el.style.display).catch(() => 'none');
        log('Step 3', errorBefore === 'none' ? 'PASS' : 'WARN', 'No error banner before payment');

        // Click Pay button
        console.log('\n\x1b[36m=== Clicking Pay ===\x1b[0m');
        const payBtn = await page.$('#tb-pay-button');
        const payBtnText = await payBtn.evaluate(el => el.textContent.trim());
        log('Payment', 'PASS', `Pay button text: "${payBtnText}"`);

        await payBtn.click();

        // Wait for either confirmation page or error
        let confirmed = false;
        let errorShown = false;

        try {
            // Wait up to 20s for confirmation
            await page.waitForFunction(() => {
                // Check for confirmation page
                var confEl = document.getElementById('tb-confirmation');
                if (confEl && window.getComputedStyle(confEl).display !== 'none') return 'confirmed';
                // Check for error banner
                var errEl = document.getElementById('tb-payment-errors');
                if (errEl && errEl.style.display === 'block') return 'error';
                return false;
            }, { timeout: 20000 });

            const result = await page.evaluate(() => {
                var confEl = document.getElementById('tb-confirmation');
                if (confEl && window.getComputedStyle(confEl).display !== 'none') return 'confirmed';
                var errEl = document.getElementById('tb-payment-errors');
                if (errEl && errEl.style.display === 'block') return 'error';
                return 'unknown';
            });

            if (result === 'confirmed') {
                confirmed = true;
            } else if (result === 'error') {
                errorShown = true;
            }
        } catch (e) {
            // Timeout — check final state
            const finalState = await page.evaluate(() => {
                var confEl = document.getElementById('tb-confirmation');
                var errEl = document.getElementById('tb-payment-errors');
                return {
                    confirmVisible: confEl ? window.getComputedStyle(confEl).display !== 'none' : false,
                    errorVisible: errEl ? errEl.style.display === 'block' : false,
                    errorText: errEl ? errEl.textContent.trim() : ''
                };
            });
            if (finalState.confirmVisible) confirmed = true;
            if (finalState.errorVisible) errorShown = true;
            if (!confirmed && !errorShown) {
                log('Payment', 'WARN', 'Timed out waiting for confirmation or error');
            }
        }

        if (confirmed) {
            console.log('\n\x1b[36m=== Confirmation page ===\x1b[0m');
            const bookingRef = await page.$eval('#tb-confirmation-ref', el => el.textContent.trim()).catch(() => '--');
            const confEmail = await page.$eval('#tb-confirmation-email', el => el.textContent.trim()).catch(() => '--');
            log('Payment', 'PASS', `Booking confirmed! Ref: ${bookingRef}`);
            log('Payment', confEmail === 'test@example.com' ? 'PASS' : 'WARN', `Confirmation email: ${confEmail}`);

            // KEY TEST: Check that no [object Object] appeared anywhere
            const pageText = await page.evaluate(() => document.body.textContent);
            const hasObjectObject = pageText.includes('[object Object]');
            log('Error Fix', !hasObjectObject ? 'PASS' : 'FAIL',
                !hasObjectObject ? 'No [object Object] found on page' : 'FOUND [object Object] on page!');
        }

        if (errorShown) {
            const errorText = await page.$eval('#tb-payment-errors', el => el.textContent.trim()).catch(() => '');
            console.log('\n\x1b[36m=== Error shown ===\x1b[0m');

            // KEY TEST: Error must NOT contain [object Object]
            const hasObjectObject = errorText.includes('[object Object]');
            log('Error Fix', !hasObjectObject ? 'PASS' : 'FAIL',
                !hasObjectObject
                    ? `Error is readable: "${errorText.substring(0, 100)}"`
                    : `ERROR: Got [object Object]! Full text: "${errorText.substring(0, 200)}"`);
        }

        if (!confirmed && !errorShown) {
            // Check the whole page for [object Object] anyway
            const pageText = await page.evaluate(() => document.body.textContent);
            const hasObjectObject = pageText.includes('[object Object]');
            log('Error Fix', !hasObjectObject ? 'PASS' : 'FAIL',
                !hasObjectObject ? 'No [object Object] found on page' : 'FOUND [object Object] on page!');
        }

    } catch (e) {
        console.error('\n\x1b[31mFATAL:\x1b[0m', e.message);
        log('Fatal', 'FAIL', e.message.substring(0, 200));
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\x1b[36m========== SUMMARY ==========\x1b[0m');
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    console.log(`  \x1b[32m${passed} passed\x1b[0m  \x1b[31m${failed} failed\x1b[0m  \x1b[33m${warned} warnings\x1b[0m`);

    if (failed > 0) {
        console.log('\n\x1b[31mFailures:\x1b[0m');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  \x1b[31m✗\x1b[0m [${r.test}] ${r.message}`);
        });
    }

    console.log('\nBrowser stays open 10s for visual check...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();

    process.exit(failed > 0 ? 1 : 0);
})();
