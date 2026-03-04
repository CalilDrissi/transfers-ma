const { test, expect } = require('@playwright/test');

test('Custom fields on transfer checkout (test-demo-2)', async ({ page }) => {
    page.setDefaultTimeout(45000);

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // ── Step 1: Load page ──
    console.log('=== Step 1: Loading test-demo-2 ===');
    await page.goto('https://transfers.ma/test-demo-2/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Dismiss cookie banner
    const acceptBtn = page.locator('text=Accept All').first();
    if (await acceptBtn.count() > 0) {
        await acceptBtn.click();
        await page.waitForTimeout(500);
    }

    // ── Step 2: Fill pickup (Agadir — matches active route) ──
    console.log('\n=== Step 2: Fill pickup ===');
    const pickup = page.locator('input[placeholder="From city, hotel, airport"]');
    await pickup.click();
    await pickup.fill('Agadir Airport');
    await page.waitForTimeout(2500);

    // Click Google Places suggestion
    const pacItem = page.locator('.pac-item').first();
    if (await pacItem.count() > 0) {
        await pacItem.click();
        console.log('Pickup: selected Google suggestion');
    } else {
        console.log('Pickup: no pac-items, trying Enter');
        await pickup.press('Enter');
    }
    await page.waitForTimeout(1500);

    // ── Step 3: Fill dropoff (Marrakech — matches active route) ──
    console.log('\n=== Step 3: Fill dropoff ===');
    const dropoff = page.locator('input[placeholder="To city, hotel, airport"]');
    await dropoff.click();
    await dropoff.fill('Marrakech');
    await page.waitForTimeout(2500);

    const pacItem2 = page.locator('.pac-item').first();
    if (await pacItem2.count() > 0) {
        await pacItem2.click();
        console.log('Dropoff: selected Google suggestion');
    } else {
        console.log('Dropoff: no pac-items');
        await dropoff.press('Enter');
    }
    await page.waitForTimeout(1500);

    // ── Step 4: Fill date ──
    console.log('\n=== Step 4: Fill datetime ===');
    // The datetime-local input (first one that's not the return)
    const dtInput = page.locator('.tb-pill-bar__input[type="datetime-local"]').first();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);
    const dtValue = nextWeek.toISOString().slice(0, 16); // "2026-03-10T14:00"
    await dtInput.fill(dtValue);
    console.log('Datetime set:', dtValue);

    await page.screenshot({ path: 'cf_02_form_filled.png', fullPage: true });

    // ── Step 5: Search ──
    console.log('\n=== Step 5: Click search ===');
    await page.locator('#tb-btn-search').click();
    console.log('Search clicked');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'cf_03_search_results.png', fullPage: true });

    // Check step 2 visibility
    const step2 = await page.evaluate(() => {
        const s = document.getElementById('tb-step-2');
        return s ? s.offsetParent !== null : false;
    });
    console.log('Step 2 visible:', step2);

    if (!step2) {
        // Check for errors
        const errorText = await page.evaluate(() => {
            const alerts = document.querySelectorAll('.tb-alert, [class*="error"]');
            return Array.from(alerts).filter(e => e.offsetParent !== null).map(e => e.textContent.trim().substring(0, 100));
        });
        console.log('Error alerts:', errorText);

        // Check if locations were resolved
        const locState = await page.evaluate(() => {
            if (typeof TB === 'undefined' || !TB.State) return 'no TB.State';
            const s = TB.State.getAll();
            return {
                pickup: s.pickupAddress,
                dropoff: s.dropoffAddress,
                pickupLat: s.pickupLat,
                dropoffLat: s.dropoffLat,
                datetime: s.pickupDatetime,
            };
        });
        console.log('Location state:', JSON.stringify(locState));
    }

    // ── Step 6: Select vehicle ──
    if (step2) {
        console.log('\n=== Step 6: Select vehicle ===');
        // Wait for vehicles to load
        await page.waitForTimeout(2000);

        const vehicleCards = await page.evaluate(() => {
            return document.querySelectorAll('.tb-vehicle-card').length;
        });
        console.log('Vehicle cards:', vehicleCards);

        // Click first vehicle select button
        const selectVehicle = page.locator('.tb-vehicle-card__select-btn').first();
        if (await selectVehicle.count() > 0) {
            await selectVehicle.click();
            console.log('Vehicle selected');
            await page.waitForTimeout(1000);
        }

        // Click Continue to proceed to Step 3
        const continueBtn = page.locator('#tb-btn-continue');
        if (await continueBtn.count() > 0 && await continueBtn.isVisible()) {
            await continueBtn.click({ force: true });
            console.log('Continue clicked');
        }
        await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: 'cf_04_vehicle_selected.png', fullPage: true });

    // ── Step 7: Check checkout & custom fields ──
    console.log('\n=== Step 7: Check checkout & custom fields ===');
    const step3 = await page.evaluate(() => {
        const s = document.getElementById('tb-step-3');
        return s ? s.offsetParent !== null : false;
    });
    console.log('Step 3 visible:', step3);

    // Wait for custom fields to load
    await page.waitForTimeout(3000);

    const cfState = await page.evaluate(() => {
        const card = document.getElementById('tb-custom-fields-card');
        const container = document.getElementById('tb-custom-fields-container');
        return {
            cardVisible: card ? (card.style.display !== 'none' && card.offsetParent !== null) : false,
            fields: container ? container.children.length : 0,
            hotelName: !!document.getElementById('tb-cf-hotel_name'),
            wheelchair: !!document.getElementById('tb-cf-wheelchair_access'),
        };
    });
    console.log('Custom fields:', JSON.stringify(cfState));

    if (cfState.hotelName) {
        console.log('\n=== Step 8: Interact with custom fields ===');

        // Fill hotel
        await page.locator('#tb-cf-hotel_name').fill('Riad Yasmine');
        console.log('Filled hotel name');

        // Check wheelchair
        if (cfState.wheelchair) {
            await page.locator('#tb-cf-wheelchair_access').check();
            console.log('Checked wheelchair');
        }

        await page.screenshot({ path: 'cf_05_fields_filled.png', fullPage: true });

        // Test validation: clear hotel and try submit
        await page.locator('#tb-cf-hotel_name').fill('');

        // Fill personal info
        await page.locator('#tb-customer-first-name').fill('Test');
        await page.locator('#tb-customer-last-name').fill('User');
        await page.locator('#tb-customer-email').fill('test@transfers.ma');
        await page.locator('#tb-customer-phone').fill('661614943');

        // Accept terms
        const terms = page.locator('#tb-terms-checkbox');
        if (await terms.count() > 0) await terms.check();

        // Select cash gateway (click the gateway option card, not the hidden radio)
        const cashOption = page.locator('.tb-gateway-option:has(input[value="cash"])');
        if (await cashOption.count() > 0) {
            await cashOption.click();
            console.log('Cash gateway selected');
        } else {
            // Fallback: click first gateway option
            await page.locator('.tb-gateway-option').first().click();
            console.log('First gateway selected (cash not available)');
        }
        await page.waitForTimeout(500);

        // Click pay
        const payBtn = page.locator('#tb-pay-button');
        if (await payBtn.count() > 0 && await payBtn.isVisible()) {
            await payBtn.click();
            await page.waitForTimeout(1500);

            const hasError = await page.evaluate(() => {
                const f = document.getElementById('tb-cf-hotel_name');
                return f ? f.classList.contains('tb-tour-checkout__input--error') : 'field not found';
            });
            console.log('Validation error on empty hotel_name:', hasError);
            await page.screenshot({ path: 'cf_06_validation.png', fullPage: true });

            // Refill and verify it clears error
            await page.locator('#tb-cf-hotel_name').fill('Riad Yasmine');
            await page.waitForTimeout(500);
            const errorCleared = await page.evaluate(() => {
                const f = document.getElementById('tb-cf-hotel_name');
                return f ? !f.classList.contains('tb-tour-checkout__input--error') : 'field not found';
            });
            console.log('Error cleared after fill:', errorCleared);
        }

        await page.screenshot({ path: 'cf_07_final.png', fullPage: true });
    } else if (step3) {
        // Step 3 is visible but custom fields didn't render
        console.log('Step 3 visible but no custom fields — manually calling init...');
        await page.evaluate(() => {
            TB.CustomFields.init('transfer', 'tb-custom-fields-container', 'tb-custom-fields-card');
        });
        await page.waitForTimeout(3000);
        const afterInit = await page.evaluate(() => {
            const c = document.getElementById('tb-custom-fields-container');
            return { children: c ? c.children.length : 0, html: c ? c.innerHTML.substring(0, 200) : '' };
        });
        console.log('After manual init:', JSON.stringify(afterInit));
        await page.screenshot({ path: 'cf_08_manual.png', fullPage: true });
    }

    if (consoleErrors.length > 0) {
        console.log('\n=== Console Errors ===');
        consoleErrors.forEach(e => console.log('  ERROR:', e));
    }

    console.log('\n=== Test complete ===');
});
