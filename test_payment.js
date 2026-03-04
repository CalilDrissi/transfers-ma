const { test, expect } = require('@playwright/test');

test('Full booking + card payment flow', async ({ page }) => {
    page.setDefaultTimeout(45000);

    const consoleErrors = [];
    const networkErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('response', res => {
        if (res.status() >= 400) {
            networkErrors.push({ url: res.url().substring(0, 120), status: res.status() });
        }
    });

    // Intercept AJAX responses for debugging
    const ajaxResponses = [];
    page.on('response', async (res) => {
        if (res.url().includes('admin-ajax.php') || res.url().includes('api.transfers.ma')) {
            try {
                const body = await res.json();
                ajaxResponses.push({ url: res.url().substring(0, 100), status: res.status(), body: JSON.stringify(body).substring(0, 500) });
            } catch {}
        }
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

    // ── Step 2: Fill pickup (Agadir — valid route) ──
    console.log('\n=== Step 2: Fill pickup ===');
    const pickup = page.locator('input[placeholder="From city, hotel, airport"]');
    await pickup.click();
    await pickup.fill('Agadir Airport');
    await page.waitForTimeout(2500);
    const pacItem = page.locator('.pac-item').first();
    if (await pacItem.count() > 0) {
        await pacItem.click();
        console.log('Pickup: selected');
    }
    await page.waitForTimeout(1500);

    // ── Step 3: Fill dropoff (Marrakech) ──
    console.log('\n=== Step 3: Fill dropoff ===');
    const dropoff = page.locator('input[placeholder="To city, hotel, airport"]');
    await dropoff.click();
    await dropoff.fill('Marrakech');
    await page.waitForTimeout(2500);
    const pacItem2 = page.locator('.pac-item').first();
    if (await pacItem2.count() > 0) {
        await pacItem2.click();
        console.log('Dropoff: selected');
    }
    await page.waitForTimeout(1500);

    // ── Step 4: Fill date ──
    console.log('\n=== Step 4: Fill datetime ===');
    const dtInput = page.locator('.tb-pill-bar__input[type="datetime-local"]').first();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);
    await dtInput.fill(nextWeek.toISOString().slice(0, 16));

    // ── Step 5: Search ──
    console.log('\n=== Step 5: Search ===');
    await page.locator('#tb-btn-search').click();
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'pay_01_search.png', fullPage: true });

    const step2Visible = await page.evaluate(() => {
        const s = document.getElementById('tb-step-2');
        return s ? s.offsetParent !== null : false;
    });
    console.log('Step 2 visible:', step2Visible);
    if (!step2Visible) { console.log('ABORT: Step 2 not visible'); return; }

    // ── Step 6: Select vehicle + Continue ──
    console.log('\n=== Step 6: Select vehicle ===');
    await page.waitForTimeout(2000);
    const vehicleCount = await page.evaluate(() => document.querySelectorAll('.tb-vehicle-card').length);
    console.log('Vehicle cards:', vehicleCount);

    await page.locator('.tb-vehicle-card__select-btn').first().click();
    console.log('Vehicle selected');
    await page.waitForTimeout(1000);

    await page.locator('#tb-btn-continue').click({ force: true });
    console.log('Continue clicked');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'pay_02_checkout.png', fullPage: true });

    const step3Visible = await page.evaluate(() => {
        const s = document.getElementById('tb-step-3');
        return s ? s.offsetParent !== null : false;
    });
    console.log('Step 3 visible:', step3Visible);
    if (!step3Visible) { console.log('ABORT: Step 3 not visible'); return; }

    // ── Step 7: Fill personal info ──
    console.log('\n=== Step 7: Fill personal info ===');
    await page.locator('#tb-customer-first-name').fill('Test');
    await page.locator('#tb-customer-last-name').fill('Payment');
    await page.locator('#tb-customer-email').fill('test@transfers.ma');
    await page.locator('#tb-customer-phone').fill('661614943');

    // Fill nationality if present
    const nationality = page.locator('#tb-customer-nationality');
    if (await nationality.count() > 0) {
        await nationality.selectOption({ index: 1 }); // Select first real option
        console.log('Nationality selected');
    }

    // Fill ALL custom fields
    const customFields = await page.evaluate(() => {
        const container = document.getElementById('tb-custom-fields-container');
        if (!container) return [];
        const fields = [];
        container.querySelectorAll('[id^="tb-cf-"]').forEach(el => {
            fields.push({
                id: el.id,
                tag: el.tagName,
                type: el.type || '',
                required: el.required || el.closest('.tb-tour-checkout__field')?.querySelector('label')?.textContent?.includes('*'),
                value: el.value,
            });
        });
        return fields;
    });
    console.log('Custom fields found:', JSON.stringify(customFields, null, 2));

    for (const cf of customFields) {
        if (cf.tag === 'INPUT' && cf.type === 'checkbox') {
            await page.locator(`#${cf.id}`).check();
            console.log(`  Checked ${cf.id}`);
        } else if (cf.tag === 'INPUT' && cf.type === 'text') {
            await page.locator(`#${cf.id}`).fill('Test Value');
            console.log(`  Filled ${cf.id}`);
        } else if (cf.tag === 'INPUT' && (cf.type === 'time' || cf.type === 'datetime-local')) {
            await page.locator(`#${cf.id}`).fill('14:00');
            console.log(`  Filled time ${cf.id}`);
        } else if (cf.tag === 'SELECT') {
            // Select second option (first is usually placeholder)
            await page.locator(`#${cf.id}`).selectOption({ index: 1 });
            console.log(`  Selected option in ${cf.id}`);
        } else if (cf.tag === 'TEXTAREA') {
            await page.locator(`#${cf.id}`).fill('Test notes');
            console.log(`  Filled textarea ${cf.id}`);
        } else {
            await page.locator(`#${cf.id}`).fill('Test');
            console.log(`  Filled ${cf.id} (fallback)`);
        }
    }

    // Accept terms
    const terms = page.locator('#tb-terms-checkbox');
    if (await terms.count() > 0) await terms.check();
    console.log('All fields filled');

    // ── Step 8: Examine payment gateways ──
    console.log('\n=== Step 8: Payment gateways ===');
    const gateways = await page.evaluate(() => {
        const options = document.querySelectorAll('.tb-gateway-option');
        return Array.from(options).map(o => ({
            value: o.querySelector('input')?.value,
            label: o.querySelector('.tb-gateway-option__name')?.textContent?.trim(),
            visible: o.offsetParent !== null,
            disabled: o.querySelector('input')?.disabled,
        }));
    });
    console.log('Gateways:', JSON.stringify(gateways, null, 2));

    // ── Step 9: Select Pay by Card (Stripe) ──
    console.log('\n=== Step 9: Select card payment ===');

    // The gateway options use labels with hidden radio inputs — use evaluate to click
    const stripeSelected = await page.evaluate(() => {
        const options = document.querySelectorAll('.tb-gateway-option');
        for (const opt of options) {
            const input = opt.querySelector('input');
            if (input && input.value === 'stripe') {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                opt.classList.add('tb-gateway-option--active');
                // Remove active from others
                options.forEach(o => { if (o !== opt) o.classList.remove('tb-gateway-option--active'); });
                return true;
            }
        }
        return false;
    });
    console.log('Stripe selected via JS:', stripeSelected);

    if (!stripeSelected) {
        // Fallback: try force click
        const stripeOpt = page.locator('.tb-gateway-option:has(input[value="stripe"])');
        if (await stripeOpt.count() > 0) {
            await stripeOpt.click({ force: true });
            console.log('Stripe selected via force click');
        }
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'pay_03_card_selected.png', fullPage: true });

    // Check deposit/full payment options
    const paymentOptions = await page.evaluate(() => {
        const el = document.getElementById('tb-payment-options');
        if (!el) return { exists: false };
        return {
            exists: true,
            visible: el.offsetParent !== null && el.style.display !== 'none',
            html: el.innerHTML.substring(0, 300),
        };
    });
    console.log('Payment options:', JSON.stringify(paymentOptions));

    // Check selected gateway and state
    const gwState = await page.evaluate(() => {
        const checked = document.querySelector('input[name="tb-gateway"]:checked');
        return {
            selectedGateway: checked?.value || 'none',
            payBtnText: document.getElementById('tb-pay-button')?.textContent?.trim(),
            payBtnDisabled: document.getElementById('tb-pay-button')?.disabled,
        };
    });
    console.log('Gateway state:', JSON.stringify(gwState));

    // ── Step 10: Debug validation then click Pay ──
    console.log('\n=== Step 10: Click Pay ===');

    // Pre-flight: check form state before clicking
    const preCheck = await page.evaluate(() => {
        var firstName = document.getElementById('tb-customer-first-name')?.value;
        var lastName = document.getElementById('tb-customer-last-name')?.value;
        var email = document.getElementById('tb-customer-email')?.value;
        var phone = document.getElementById('tb-customer-phone')?.value;
        var terms = document.getElementById('tb-terms-checkbox')?.checked;
        var nationality = document.getElementById('tb-customer-nationality')?.value;
        var gateway = document.querySelector('input[name="tb-gateway"]:checked')?.value;
        var cfValues = TB.CustomFields ? TB.CustomFields.getValues() : {};
        var cfValid = TB.CustomFields ? TB.CustomFields.validate() : 'no CF module';

        // Test phone validation
        var phoneValid = TB.Utils.validatePhone ? TB.Utils.validatePhone(phone) : 'no validatePhone';

        return {
            firstName, lastName, email, phone, terms, nationality, gateway,
            cfValues, cfValid, phoneValid,
            validateResult: TB.Step3.validate()
        };
    });
    console.log('Pre-check:', JSON.stringify(preCheck, null, 2));

    // Check what errors appeared after validate() call
    const validationErrors = await page.evaluate(() => {
        var errors = document.querySelectorAll('.tb-field-error');
        return Array.from(errors).map(e => ({
            id: e.id,
            parentId: e.parentElement?.id,
            text: e.textContent?.trim(),
            visible: e.offsetParent !== null,
            display: window.getComputedStyle(e).display,
            height: e.offsetHeight,
        }));
    });
    console.log('Validation errors after validate():', JSON.stringify(validationErrors, null, 2));

    // Clear errors and try again
    await page.evaluate(() => TB.Utils.clearFieldErrors());

    const payBtn = page.locator('#tb-pay-button');
    console.log('Pay button text:', await payBtn.textContent());

    // Clear ajax responses to track only pay-related calls
    ajaxResponses.length = 0;

    await payBtn.click();
    console.log('Pay button clicked, waiting for response...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'pay_04_after_pay.png', fullPage: true });

    // ── Step 11: Analyze result ──
    console.log('\n=== Step 11: Result analysis ===');

    const result = await page.evaluate(() => {
        const body = document.body.textContent;
        const stripeEl = document.getElementById('tb-stripe-element');
        const confEl = document.getElementById('tb-confirmation');
        const errEl = document.getElementById('tb-payment-errors');
        const step4 = document.getElementById('tb-step-4');

        return {
            // Stripe card form
            stripeElement: stripeEl ? {
                visible: stripeEl.offsetParent !== null,
                display: window.getComputedStyle(stripeEl).display,
                childCount: stripeEl.children.length,
                html: stripeEl.innerHTML.substring(0, 300),
            } : null,
            // Confirmation
            confirmation: confEl ? {
                visible: confEl.offsetParent !== null,
                display: window.getComputedStyle(confEl).display,
            } : null,
            // Step 4 (confirmation step)
            step4: step4 ? {
                visible: step4.offsetParent !== null,
                display: window.getComputedStyle(step4).display,
            } : null,
            // Errors
            paymentErrors: errEl ? {
                visible: errEl.style.display !== 'none' && errEl.offsetParent !== null,
                text: errEl.textContent?.trim().substring(0, 300),
            } : null,
            // Page-wide errors
            hasObjectObject: body.includes('[object Object]'),
            // All visible alerts
            alerts: Array.from(document.querySelectorAll('.tb-alert, .tb-toast, [class*="error"]'))
                .filter(e => e.offsetParent !== null)
                .map(e => ({ class: e.className?.substring(0, 60), text: e.textContent?.trim().substring(0, 200) })),
            // Check all iframes (Stripe uses iframes)
            iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({
                src: f.src?.substring(0, 100),
                name: f.name,
                visible: f.offsetParent !== null,
            })),
            // Current URL
            url: window.location.href,
        };
    });

    console.log('Stripe element:', JSON.stringify(result.stripeElement, null, 2));
    console.log('Confirmation:', JSON.stringify(result.confirmation, null, 2));
    console.log('Step 4:', JSON.stringify(result.step4, null, 2));
    console.log('Payment errors:', JSON.stringify(result.paymentErrors, null, 2));
    console.log('Has [object Object]:', result.hasObjectObject);
    console.log('Visible alerts:', JSON.stringify(result.alerts, null, 2));
    console.log('Iframes:', JSON.stringify(result.iframes, null, 2));
    console.log('Current URL:', result.url);

    // Log AJAX responses from the payment flow
    console.log('\n=== AJAX responses during payment ===');
    ajaxResponses.forEach(r => console.log(`  ${r.status} ${r.url}\n    ${r.body}`));

    // ── Summary ──
    console.log('\n=== Summary ===');
    console.log('Console errors:', consoleErrors.length);
    consoleErrors.forEach(e => console.log('  CONSOLE:', e));
    console.log('Network errors (4xx/5xx):', networkErrors.length);
    networkErrors.forEach(e => console.log('  NETWORK:', e.status, e.url));
    console.log('\n=== Test complete ===');
});
