/**
 * Step 3: Customer info and Stripe payment.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var stripe = null;
    var elements = null;
    var paymentElement = null;

    /* ── Country dial codes ── */
    var COUNTRIES = [
        { name: 'Morocco', code: '+212', flag: '🇲🇦', iso: 'MA' },
        { name: 'France', code: '+33', flag: '🇫🇷', iso: 'FR' },
        { name: 'Spain', code: '+34', flag: '🇪🇸', iso: 'ES' },
        { name: 'United Kingdom', code: '+44', flag: '🇬🇧', iso: 'GB' },
        { name: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
        { name: 'Germany', code: '+49', flag: '🇩🇪', iso: 'DE' },
        { name: 'Italy', code: '+39', flag: '🇮🇹', iso: 'IT' },
        { name: 'Portugal', code: '+351', flag: '🇵🇹', iso: 'PT' },
        { name: 'Netherlands', code: '+31', flag: '🇳🇱', iso: 'NL' },
        { name: 'Belgium', code: '+32', flag: '🇧🇪', iso: 'BE' },
        { name: 'Switzerland', code: '+41', flag: '🇨🇭', iso: 'CH' },
        { name: 'Canada', code: '+1', flag: '🇨🇦', iso: 'CA' },
        { name: 'Algeria', code: '+213', flag: '🇩🇿', iso: 'DZ' },
        { name: 'Tunisia', code: '+216', flag: '🇹🇳', iso: 'TN' },
        { name: 'Egypt', code: '+20', flag: '🇪🇬', iso: 'EG' },
        { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', iso: 'SA' },
        { name: 'UAE', code: '+971', flag: '🇦🇪', iso: 'AE' },
        { name: 'Qatar', code: '+974', flag: '🇶🇦', iso: 'QA' },
        { name: 'Turkey', code: '+90', flag: '🇹🇷', iso: 'TR' },
        { name: 'Brazil', code: '+55', flag: '🇧🇷', iso: 'BR' },
        { name: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
        { name: 'China', code: '+86', flag: '🇨🇳', iso: 'CN' },
        { name: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
        { name: 'South Korea', code: '+82', flag: '🇰🇷', iso: 'KR' },
        { name: 'Australia', code: '+61', flag: '🇦🇺', iso: 'AU' },
        { name: 'Russia', code: '+7', flag: '🇷🇺', iso: 'RU' },
        { name: 'Mexico', code: '+52', flag: '🇲🇽', iso: 'MX' },
        { name: 'Sweden', code: '+46', flag: '🇸🇪', iso: 'SE' },
        { name: 'Norway', code: '+47', flag: '🇳🇴', iso: 'NO' },
        { name: 'Denmark', code: '+45', flag: '🇩🇰', iso: 'DK' },
        { name: 'Poland', code: '+48', flag: '🇵🇱', iso: 'PL' },
        { name: 'Austria', code: '+43', flag: '🇦🇹', iso: 'AT' },
        { name: 'Ireland', code: '+353', flag: '🇮🇪', iso: 'IE' },
        { name: 'Greece', code: '+30', flag: '🇬🇷', iso: 'GR' },
        { name: 'Czech Republic', code: '+420', flag: '🇨🇿', iso: 'CZ' },
        { name: 'Romania', code: '+40', flag: '🇷🇴', iso: 'RO' },
        { name: 'Hungary', code: '+36', flag: '🇭🇺', iso: 'HU' },
        { name: 'Israel', code: '+972', flag: '🇮🇱', iso: 'IL' },
        { name: 'South Africa', code: '+27', flag: '🇿🇦', iso: 'ZA' },
        { name: 'Nigeria', code: '+234', flag: '🇳🇬', iso: 'NG' },
        { name: 'Kenya', code: '+254', flag: '🇰🇪', iso: 'KE' },
        { name: 'Senegal', code: '+221', flag: '🇸🇳', iso: 'SN' },
        { name: 'Ivory Coast', code: '+225', flag: '🇨🇮', iso: 'CI' },
        { name: 'Mauritania', code: '+222', flag: '🇲🇷', iso: 'MR' },
        { name: 'Libya', code: '+218', flag: '🇱🇾', iso: 'LY' },
        { name: 'Jordan', code: '+962', flag: '🇯🇴', iso: 'JO' },
        { name: 'Lebanon', code: '+961', flag: '🇱🇧', iso: 'LB' },
        { name: 'Kuwait', code: '+965', flag: '🇰🇼', iso: 'KW' },
        { name: 'Bahrain', code: '+973', flag: '🇧🇭', iso: 'BH' },
        { name: 'Oman', code: '+968', flag: '🇴🇲', iso: 'OM' },
        { name: 'Iraq', code: '+964', flag: '🇮🇶', iso: 'IQ' },
        { name: 'Argentina', code: '+54', flag: '🇦🇷', iso: 'AR' },
        { name: 'Colombia', code: '+57', flag: '🇨🇴', iso: 'CO' },
        { name: 'Chile', code: '+56', flag: '🇨🇱', iso: 'CL' },
        { name: 'Thailand', code: '+66', flag: '🇹🇭', iso: 'TH' },
        { name: 'Malaysia', code: '+60', flag: '🇲🇾', iso: 'MY' },
        { name: 'Singapore', code: '+65', flag: '🇸🇬', iso: 'SG' },
        { name: 'Philippines', code: '+63', flag: '🇵🇭', iso: 'PH' },
        { name: 'Indonesia', code: '+62', flag: '🇮🇩', iso: 'ID' },
        { name: 'New Zealand', code: '+64', flag: '🇳🇿', iso: 'NZ' },
        { name: 'Finland', code: '+358', flag: '🇫🇮', iso: 'FI' }
    ];

    /** Set up a country-code phone dropdown */
    function initPhoneDropdown(prefixId, flagId, codeId, dropdownId, searchId, listId) {
        var prefix = document.getElementById(prefixId);
        var flagEl = document.getElementById(flagId);
        var codeEl = document.getElementById(codeId);
        var dropdown = document.getElementById(dropdownId);
        var searchInput = document.getElementById(searchId);
        var listEl = document.getElementById(listId);
        if (!prefix || !dropdown || !listEl) return;

        var selectedCode = '+212';

        function renderList(filter) {
            var q = (filter || '').toLowerCase();
            var html = '';
            for (var i = 0; i < COUNTRIES.length; i++) {
                var c = COUNTRIES[i];
                if (q && c.name.toLowerCase().indexOf(q) === -1 && c.code.indexOf(q) === -1 && c.iso.toLowerCase().indexOf(q) === -1) continue;
                var active = c.code === selectedCode ? ' tb-phone-dropdown__item--active' : '';
                html += '<div class="tb-phone-dropdown__item' + active + '" data-code="' + c.code + '" data-flag="' + c.flag + '" data-name="' + c.name + '">'
                    + '<span class="tb-phone-dropdown__item-flag">' + c.flag + '</span>'
                    + '<span class="tb-phone-dropdown__item-name">' + c.name + '</span>'
                    + '<span class="tb-phone-dropdown__item-code">' + c.code + '</span>'
                    + '</div>';
            }
            listEl.innerHTML = html || '<div style="padding:12px;color:#999;text-align:center;">No results</div>';
        }

        function open() {
            dropdown.style.display = 'flex';
            prefix.setAttribute('aria-expanded', 'true');
            renderList('');
            if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        }

        function close() {
            dropdown.style.display = 'none';
            prefix.setAttribute('aria-expanded', 'false');
        }

        function select(code, flag) {
            selectedCode = code;
            if (flagEl) flagEl.textContent = flag;
            if (codeEl) codeEl.textContent = code;
            close();
        }

        prefix.addEventListener('click', function (e) {
            e.stopPropagation();
            if (dropdown.style.display === 'none') open(); else close();
        });

        if (searchInput) {
            searchInput.addEventListener('input', function () { renderList(this.value); });
            searchInput.addEventListener('click', function (e) { e.stopPropagation(); });
        }

        listEl.addEventListener('click', function (e) {
            var item = e.target.closest('.tb-phone-dropdown__item');
            if (item) select(item.dataset.code, item.dataset.flag);
        });

        document.addEventListener('click', function (e) {
            if (!prefix.contains(e.target) && !dropdown.contains(e.target)) close();
        });

        return { getCode: function () { return selectedCode; }, setCode: select };
    }

    var phoneDropdown = null;
    var waDropdown = null;

    TB.Step3 = {

        init: function () {
            phoneDropdown = initPhoneDropdown('tb-phone-prefix', 'tb-phone-flag', 'tb-phone-code', 'tb-phone-dropdown', 'tb-phone-search', 'tb-phone-list');
            waDropdown = initPhoneDropdown('tb-wa-prefix', 'tb-wa-flag', 'tb-wa-code', 'tb-wa-dropdown', 'tb-wa-search', 'tb-wa-list');
            this.renderOrderSummary();
            this.renderPaymentOptions();
            this.renderGatewaySelector();
            this.restoreCustomerInfo();
            this.initStripe();
            this.bindEvents();
            this.resetPaymentUI();
        },

        initStripe: function () {
            if (!tbConfig.stripePublishableKey) return;
            if (!stripe) {
                stripe = Stripe(tbConfig.stripePublishableKey);
            }
        },

        renderGatewaySelector: function () {
            var self = this;
            var selector = document.getElementById('tb-gateway-selector');
            if (!selector) return;

            // Fetch active gateways from Django API
            TB.API.getGateways()
                .then(function (data) {
                    // data is an array of gateway objects with gateway_type field
                    var gateways = [];
                    var results = data.results || data;
                    for (var i = 0; i < results.length; i++) {
                        gateways.push(results[i].gateway_type);
                    }

                    if (gateways.length === 0) gateways.push('cash');

                    self._applyGatewaySelector(selector, gateways);
                })
                .catch(function () {
                    // On API failure, default to cash only
                    self._applyGatewaySelector(selector, ['cash']);
                });
        },

        _applyGatewaySelector: function (selector, gateways) {
            // Show/hide each option
            var options = selector.querySelectorAll('.tb-gateway-option');
            for (var i = 0; i < options.length; i++) {
                var gw = options[i].getAttribute('data-gateway');
                options[i].classList.remove('tb-gateway-option--active');
                if (gateways.indexOf(gw) !== -1) {
                    options[i].style.setProperty('display', '', 'important');
                } else {
                    options[i].style.setProperty('display', 'none', 'important');
                }
            }

            // Auto-select first available
            var firstVisible = null;
            for (var j = 0; j < options.length; j++) {
                if (gateways.indexOf(options[j].getAttribute('data-gateway')) !== -1) {
                    firstVisible = options[j];
                    break;
                }
            }
            if (firstVisible) {
                var radio = firstVisible.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
                firstVisible.classList.add('tb-gateway-option--active');
            }

            // Only show selector if more than one gateway
            if (gateways.length > 1) {
                selector.style.setProperty('display', 'flex', 'important');
            } else {
                selector.style.setProperty('display', 'none', 'important');
            }

            // Update button text and deposit visibility for selected gateway
            this.updateDepositVisibility();
            this.updatePayButtonText();
        },

        getSelectedGateway: function () {
            var checked = document.querySelector('input[name="tb-gateway"]:checked');
            return checked ? checked.value : 'stripe';
        },

        updateDepositVisibility: function () {
            var gateway = this.getSelectedGateway();
            var optionsEl = document.getElementById('tb-payment-options');
            if (!optionsEl) return;

            if (gateway === 'cash') {
                optionsEl.style.display = 'none';
                TB.State.set('paymentChoice', 'full');
            }
        },

        renderPaymentOptions: function () {
            var state = TB.State.getAll();
            var pricingData = state.pricingData || {};
            var depositAmount = pricingData.deposit_amount || 0;
            var depositPct = pricingData.deposit_percentage || 0;
            var optionsEl = document.getElementById('tb-payment-options');

            if (!optionsEl) return;

            // Calculate totals
            var vehicle = state.selectedVehicle;
            var basePrice = vehicle ? vehicle.price : 0;
            var extrasTotal = 0;
            var se = state.selectedExtras || [];
            for (var i = 0; i < se.length; i++) {
                extrasTotal += se[i].price * (se[i].is_per_item ? se[i].quantity : 1);
            }
            var totalPrice = basePrice + extrasTotal;
            if (state.isRoundTrip) totalPrice *= 2;

            // Recalculate deposit from percentage if available
            if (depositPct > 0) {
                depositAmount = Math.round(totalPrice * depositPct / 100);
            }

            if (depositAmount > 0 && depositAmount < totalPrice) {
                optionsEl.style.display = 'flex';
                var remaining = totalPrice - depositAmount;

                var fullAmountEl = document.getElementById('tb-option-full-amount');
                var depositAmountEl = document.getElementById('tb-option-deposit-amount');
                var remainingEl = document.getElementById('tb-option-remaining');

                if (fullAmountEl) fullAmountEl.textContent = TB.Utils.formatPrice(totalPrice);
                if (depositAmountEl) depositAmountEl.textContent = TB.Utils.formatPrice(depositAmount);
                if (remainingEl) remainingEl.textContent = TB.Utils.formatPrice(remaining) + ' ' + (tbConfig.i18n.remainingToDriver || 'remaining to driver');

                TB.State.set('depositAmount', depositAmount);
                TB.State.set('paymentChoice', 'full');
            } else {
                optionsEl.style.display = 'none';
                TB.State.set('paymentChoice', 'full');
            }
        },

        bindEvents: function () {
            var self = this;

            // Back button
            var backBtns = document.querySelectorAll('#tb-step-3 .tb-btn-back');
            for (var i = 0; i < backBtns.length; i++) {
                backBtns[i].addEventListener('click', function () {
                    TB.Wizard.showStep(2);
                });
            }

            // Pay button
            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn) {
                payBtn.addEventListener('click', function () {
                    self.submitBooking();
                });
            }

            // Confirm payment button
            var confirmBtn = document.getElementById('tb-confirm-payment-btn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', function () {
                    self.confirmPayment();
                });
            }

            // Payment option radios
            var radios = document.querySelectorAll('input[name="tb-payment-type"]');
            for (var r = 0; r < radios.length; r++) {
                radios[r].addEventListener('change', function () {
                    // Update active class
                    var options = document.querySelectorAll('.tb-payment-option');
                    for (var k = 0; k < options.length; k++) {
                        options[k].classList.remove('tb-payment-option--active');
                    }
                    this.closest('.tb-payment-option').classList.add('tb-payment-option--active');

                    TB.State.set('paymentChoice', this.value);
                    self.updatePayButtonText();
                });
            }

            // Gateway radio selection
            var gwRadios = document.querySelectorAll('input[name="tb-gateway"]');
            for (var g = 0; g < gwRadios.length; g++) {
                gwRadios[g].addEventListener('change', function () {
                    var gwOptions = document.querySelectorAll('.tb-gateway-option');
                    for (var gi = 0; gi < gwOptions.length; gi++) {
                        gwOptions[gi].classList.remove('tb-gateway-option--active');
                    }
                    this.closest('.tb-gateway-option').classList.add('tb-gateway-option--active');
                    self.updateDepositVisibility();
                    self.updatePayButtonText();
                });
            }

            // Save customer info on input
            var fields = ['tb-customer-first-name', 'tb-customer-last-name', 'tb-customer-email', 'tb-customer-phone', 'tb-customer-whatsapp', 'tb-special-requests'];
            for (var j = 0; j < fields.length; j++) {
                var el = document.getElementById(fields[j]);
                if (el) {
                    el.addEventListener('input', function () {
                        self.saveCustomerInfo();
                    });
                }
            }
        },

        updatePayButtonText: function () {
            var payBtn = document.getElementById('tb-pay-button');
            if (!payBtn) return;
            var gateway = this.getSelectedGateway();
            var choice = TB.State.get('paymentChoice') || 'full';
            var state = TB.State.getAll();
            var vehicle = state.selectedVehicle;
            var basePrice = vehicle ? vehicle.price : 0;
            var extrasTotal = 0;
            var se = state.selectedExtras || [];
            for (var i = 0; i < se.length; i++) {
                extrasTotal += se[i].price * (se[i].is_per_item ? se[i].quantity : 1);
            }
            var totalPrice = basePrice + extrasTotal;
            if (state.isRoundTrip) totalPrice *= 2;

            if (gateway === 'cash') {
                payBtn.textContent = (tbConfig.i18n.payCash || 'Pay Cash to Driver') + ' ' + TB.Utils.formatPrice(totalPrice);
            } else if (gateway === 'paypal') {
                payBtn.textContent = (tbConfig.i18n.payWithPaypal || 'Pay with PayPal') + ' ' + TB.Utils.formatPrice(totalPrice);
            } else if (choice === 'deposit') {
                var dep = state.depositAmount || 0;
                payBtn.textContent = (tbConfig.i18n.payNow || 'Pay') + ' ' + TB.Utils.formatPrice(dep) + ' (' + (tbConfig.i18n.depositOnly || 'deposit') + ')';
            } else {
                payBtn.textContent = (tbConfig.i18n.payNow || 'Pay') + ' ' + TB.Utils.formatPrice(totalPrice);
            }
        },

        restoreCustomerInfo: function () {
            var s = TB.State.getAll();
            var firstName = document.getElementById('tb-customer-first-name');
            var lastName = document.getElementById('tb-customer-last-name');
            var email = document.getElementById('tb-customer-email');
            var phone = document.getElementById('tb-customer-phone');
            var whatsapp = document.getElementById('tb-customer-whatsapp');
            var requests = document.getElementById('tb-special-requests');

            if (firstName && s.customerName) {
                var parts = s.customerName.split(' ');
                firstName.value = parts[0] || '';
                if (lastName) lastName.value = parts.slice(1).join(' ') || '';
            }
            if (email && s.customerEmail) email.value = s.customerEmail;
            if (phone && s.customerPhone) phone.value = s.customerPhone;
            if (whatsapp && s.customerWhatsapp) whatsapp.value = s.customerWhatsapp;
            if (requests && s.specialRequests) requests.value = s.specialRequests;
        },

        saveCustomerInfo: function () {
            var firstName = document.getElementById('tb-customer-first-name');
            var lastName = document.getElementById('tb-customer-last-name');
            var email = document.getElementById('tb-customer-email');
            var phone = document.getElementById('tb-customer-phone');
            var whatsapp = document.getElementById('tb-customer-whatsapp');
            var requests = document.getElementById('tb-special-requests');

            var fn = firstName ? firstName.value.trim() : '';
            var ln = lastName ? lastName.value.trim() : '';
            TB.State.set('customerName', (fn + ' ' + ln).trim());
            if (email) TB.State.set('customerEmail', email.value.trim());
            if (phone) {
                var phoneCode = phoneDropdown ? phoneDropdown.getCode() : '+212';
                var phoneNum = phone.value.trim().replace(/^\+/, '');
                TB.State.set('customerPhone', phoneNum ? phoneCode + phoneNum : '');
            }
            if (whatsapp) {
                var waCode = waDropdown ? waDropdown.getCode() : '+212';
                var waNum = whatsapp.value.trim().replace(/^\+/, '');
                TB.State.set('customerWhatsapp', waNum ? waCode + waNum : '');
            }
            if (requests) TB.State.set('specialRequests', requests.value.trim());
        },

        renderOrderSummary: function () {
            var state = TB.State.getAll();

            // Hidden compat elements
            var route = document.getElementById('tb-order-route');
            var datetime = document.getElementById('tb-order-datetime');
            if (route) route.textContent = TB.Utils.shortName(state.pickupAddress) + ' → ' + TB.Utils.shortName(state.dropoffAddress);
            if (datetime) datetime.textContent = TB.Utils.formatDateTime(state.pickupDatetime);

            // Gradient sidebar
            var vehicle = document.getElementById('tb-order-vehicle');
            var passengers = document.getElementById('tb-order-passengers');
            var routeFrom = document.getElementById('tb-order-route-from');
            var routeTo = document.getElementById('tb-order-route-to');
            var basePrice = document.getElementById('tb-order-base-price');
            if (vehicle) vehicle.textContent = state.selectedVehicle ? state.selectedVehicle.category_name : '--';
            if (passengers) passengers.textContent = state.passengers + ' ' + (tbConfig.i18n.passengersLabel || 'passengers');
            if (routeFrom) routeFrom.textContent = TB.Utils.shortName(state.pickupAddress);
            if (routeTo) routeTo.textContent = TB.Utils.shortName(state.dropoffAddress);
            if (basePrice && state.selectedVehicle) basePrice.textContent = TB.Utils.formatPrice(state.selectedVehicle.price);

            // Transfer details card
            var pickupDisplay = document.getElementById('tb-checkout-pickup-display');
            var dropoffDisplay = document.getElementById('tb-checkout-dropoff-display');
            if (pickupDisplay) pickupDisplay.textContent = state.pickupAddress || '--';
            if (dropoffDisplay) dropoffDisplay.textContent = state.dropoffAddress || '--';

            // Date/time split
            if (state.pickupDatetime) {
                var dt = new Date(state.pickupDatetime);
                var dateDisplay = document.getElementById('tb-checkout-date-display');
                var timeDisplay = document.getElementById('tb-checkout-time-display');
                if (dateDisplay && !isNaN(dt.getTime())) {
                    var y = dt.getFullYear();
                    var m = ('0' + (dt.getMonth() + 1)).slice(-2);
                    var d = ('0' + dt.getDate()).slice(-2);
                    dateDisplay.value = y + '-' + m + '-' + d;
                }
                if (timeDisplay && !isNaN(dt.getTime())) {
                    var hh = ('0' + dt.getHours()).slice(-2);
                    var mm = ('0' + dt.getMinutes()).slice(-2);
                    timeDisplay.value = hh + ':' + mm;
                }
            }

            // Pickup instructions
            var pickupInstrEl = document.getElementById('tb-pickup-instructions');
            if (pickupInstrEl) {
                var pricingData = state.pricingData || {};
                var pickupInstr = pricingData.pickup_instructions;
                if (pickupInstr) {
                    pickupInstrEl.innerHTML = '<div class="tb-pickup-instructions">'
                        + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> '
                        + TB.Utils.escapeHtml(pickupInstr)
                        + '</div>';
                } else {
                    pickupInstrEl.innerHTML = '';
                }
            }

            // Flight field — show if airport detected
            var flightGroup = document.getElementById('tb-checkout-flight-group');
            if (flightGroup) {
                var fromLower = (state.pickupAddress || '').toLowerCase();
                var toLower = (state.dropoffAddress || '').toLowerCase();
                if (fromLower.indexOf('airport') !== -1 || toLower.indexOf('airport') !== -1 ||
                    fromLower.indexOf('aeroport') !== -1 || toLower.indexOf('aeroport') !== -1 ||
                    fromLower.indexOf('aéroport') !== -1 || toLower.indexOf('aéroport') !== -1) {
                    flightGroup.style.display = '';
                }
            }

            // Extras in gradient
            var extrasList = document.getElementById('tb-order-extras-list');
            if (extrasList) {
                var selectedExtras = state.selectedExtras || [];
                var html = '';
                for (var i = 0; i < selectedExtras.length; i++) {
                    var e = selectedExtras[i];
                    var price = e.price * (e.is_per_item ? e.quantity : 1);
                    html += '<div class="tb-summary-gradient__extra"><span>' + TB.Utils.escapeHtml(e.name);
                    if (e.is_per_item && e.quantity > 1) html += ' x' + e.quantity;
                    html += '</span><span>' + TB.Utils.formatPrice(price) + '</span></div>';
                }
                extrasList.innerHTML = html;
            }

            // Total
            var total = document.getElementById('tb-order-total');
            if (total) {
                var quoteData = state.quoteData;
                if (quoteData && quoteData.total_price) {
                    total.textContent = TB.Utils.formatPrice(quoteData.total_price, quoteData.currency);
                } else {
                    var v = state.selectedVehicle;
                    var bp = v ? v.price : 0;
                    var extrasTotal = 0;
                    var se = state.selectedExtras || [];
                    for (var j = 0; j < se.length; j++) {
                        extrasTotal += se[j].price * (se[j].is_per_item ? se[j].quantity : 1);
                    }
                    var t = bp + extrasTotal;
                    if (state.isRoundTrip) t *= 2;
                    total.textContent = TB.Utils.formatPrice(t);
                }
            }

            // Update pay button text with amount
            this.updatePayButtonText();
        },

        resetPaymentUI: function () {
            document.getElementById('tb-pay-button').style.setProperty('display', 'block', 'important');
            document.getElementById('tb-stripe-element').style.setProperty('display', 'none', 'important');
            document.getElementById('tb-confirm-payment-btn').style.setProperty('display', 'none', 'important');
            TB.Utils.hideAlert('tb-payment-errors');

            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.classList.remove('tb-btn--loading');
            }
        },

        validate: function () {
            TB.Utils.clearFieldErrors();
            var errors = [];

            var firstNameEl = document.getElementById('tb-customer-first-name');
            var lastNameEl = document.getElementById('tb-customer-last-name');
            var firstName = firstNameEl ? firstNameEl.value.trim() : '';
            var lastName = lastNameEl ? lastNameEl.value.trim() : '';
            var email = document.getElementById('tb-customer-email').value.trim();
            var phone = document.getElementById('tb-customer-phone').value.trim();

            if (!firstName) errors.push({ field: 'first-name', msg: tbConfig.i18n.required });
            if (!lastName) errors.push({ field: 'last-name', msg: tbConfig.i18n.required });
            if (!email) errors.push({ field: 'email', msg: tbConfig.i18n.required });
            else if (!TB.Utils.validateEmail(email)) errors.push({ field: 'email', msg: tbConfig.i18n.invalidEmail });
            if (!phone || !TB.Utils.validatePhone(phone)) errors.push({ field: 'phone', msg: tbConfig.i18n.invalidPhone });

            for (var i = 0; i < errors.length; i++) {
                TB.Utils.showFieldError(errors[i].field, errors[i].msg);
            }

            return errors.length === 0;
        },

        submitBooking: function () {
            if (!this.validate()) return;

            this.saveCustomerInfo();
            TB.Utils.hideAlert('tb-payment-errors');

            var payBtn = document.getElementById('tb-pay-button');
            TB.Utils.setButtonLoading(payBtn, true);

            var gateway = this.getSelectedGateway();
            var state = TB.State.getAll();
            var extrasPayload = [];
            var se = state.selectedExtras || [];
            for (var i = 0; i < se.length; i++) {
                extrasPayload.push({ extra_id: se[i].id, quantity: se[i].quantity });
            }

            var bookingData = {
                customer_name: state.customerName,
                customer_email: state.customerEmail,
                customer_phone: state.customerPhone,
                transfer_type: state.transferType,
                pickup_address: state.pickupAddress,
                pickup_latitude: state.pickupLat,
                pickup_longitude: state.pickupLng,
                dropoff_address: state.dropoffAddress,
                dropoff_latitude: state.dropoffLat,
                dropoff_longitude: state.dropoffLng,
                pickup_datetime: state.pickupDatetime,
                passengers: state.passengers,
                luggage: state.luggage || state.passengers,
                vehicle_category_id: state.selectedVehicle.category_id,
                flight_number: state.flightNumber || '',
                special_requests: state.specialRequests || '',
                is_round_trip: state.isRoundTrip,
                extras: extrasPayload
            };

            if (state.isRoundTrip && state.returnDatetime) {
                bookingData.return_datetime = state.returnDatetime;
            }

            // Step A: Create the booking
            TB.API.createBooking(bookingData)
                .then(function (booking) {
                    TB.State.set('bookingId', booking.id);
                    TB.State.set('bookingRef', booking.booking_ref);
                    TB.State.set('totalPrice', booking.total_price);
                    TB.State.set('currency', booking.currency);
                    TB.State.save();

                    // Step B: Create payment with selected gateway
                    var choice = TB.State.get('paymentChoice') || 'full';
                    var payAmount = (choice === 'deposit') ? TB.State.get('depositAmount') : null;
                    return TB.API.createPayment(booking.id, gateway, payAmount);
                })
                .then(function (paymentData) {
                    TB.State.set('paymentRef', paymentData.payment_ref);
                    TB.State.save();

                    TB.Utils.setButtonLoading(payBtn, false);

                    if (gateway === 'cash') {
                        // Cash: confirm immediately and show confirmation
                        TB.API.confirmPayment(paymentData.payment_ref)
                            .then(function () {
                                TB.Step3.showConfirmation();
                            })
                            .catch(function () {
                                // Still show confirmation — backend will reconcile
                                TB.Step3.showConfirmation();
                            });
                    } else if (gateway === 'paypal') {
                        // PayPal: redirect to approval URL if returned
                        if (paymentData.redirect_url) {
                            window.location.href = paymentData.redirect_url;
                        } else {
                            TB.Step3.showConfirmation();
                        }
                    } else {
                        // Stripe: Mount Stripe Elements
                        TB.Step3.mountStripeElements(paymentData.client_secret);
                    }
                })
                .catch(function (err) {
                    TB.Utils.setButtonLoading(payBtn, false);
                    var msg = (typeof err === 'string') ? err
                        : (err && err.message) ? err.message
                        : tbConfig.i18n.errorGeneric || 'An error occurred.';
                    TB.Utils.showAlert('tb-payment-errors', msg);
                });
        },

        mountStripeElements: function (clientSecret) {
            if (!stripe) {
                TB.Utils.showAlert('tb-payment-errors', 'Stripe is not configured.');
                return;
            }

            // Hide pay button, show Stripe element
            document.getElementById('tb-pay-button').style.setProperty('display', 'none', 'important');
            var stripeContainer = document.getElementById('tb-stripe-element');
            stripeContainer.style.setProperty('display', 'block', 'important');
            stripeContainer.innerHTML = '';

            elements = stripe.elements({ clientSecret: clientSecret });
            paymentElement = elements.create('payment');
            paymentElement.mount('#tb-stripe-element');

            // Show confirm button
            document.getElementById('tb-confirm-payment-btn').style.setProperty('display', 'block', 'important');
        },

        confirmPayment: function () {
            var confirmBtn = document.getElementById('tb-confirm-payment-btn');
            TB.Utils.setButtonLoading(confirmBtn, true);
            TB.Utils.hideAlert('tb-payment-errors');

            // Step D: Confirm with Stripe
            stripe.confirmPayment({
                elements: elements,
                confirmParams: {},
                redirect: 'if_required'
            }).then(function (result) {
                if (result.error) {
                    TB.Utils.setButtonLoading(confirmBtn, false);
                    TB.Utils.showAlert('tb-payment-errors', result.error.message);
                } else {
                    // Step E: Confirm on our backend
                    TB.API.confirmPayment(TB.State.get('paymentRef'))
                        .then(function () {
                            TB.Step3.showConfirmation();
                        })
                        .catch(function () {
                            // Payment succeeded on Stripe but our confirm failed.
                            // Webhook on Django will handle this. Still show confirmation.
                            TB.Step3.showConfirmation();
                        });
                }
            });
        },

        showConfirmation: function () {
            var state = TB.State.getAll();
            var quote = state.quoteData || {};
            var currency = state.currency || 'MAD';

            // Set confirmation data
            var refEl = document.getElementById('tb-confirmation-ref');
            var emailEl = document.getElementById('tb-confirmation-email');
            if (refEl) refEl.textContent = state.bookingRef;
            if (emailEl) emailEl.textContent = state.customerEmail;

            // Populate receipt
            var vehicle = state.selectedVehicle;
            var gateway = this.getSelectedGateway();
            var gatewayLabel = gateway === 'cash' ? 'Cash' : gateway === 'paypal' ? 'PayPal' : 'Card';

            var setEl = function (id, val) {
                var el = document.getElementById(id);
                if (el) el.textContent = val || '--';
            };

            setEl('tb-receipt-ref', state.bookingRef);
            setEl('tb-receipt-datetime', TB.Utils.formatDateTime(state.pickupDatetime));
            setEl('tb-receipt-pickup', state.pickupAddress);
            setEl('tb-receipt-dropoff', state.dropoffAddress);
            setEl('tb-receipt-vehicle', vehicle ? vehicle.category_name : '--');
            setEl('tb-receipt-passengers', state.passengers);
            setEl('tb-receipt-payment', gatewayLabel);

            // Price breakdown
            var basePrice = quote.base_price || (vehicle ? vehicle.price : 0);
            setEl('tb-receipt-base-price', TB.Utils.formatPrice(basePrice, currency));

            // Extras
            var extrasListEl = document.getElementById('tb-receipt-extras-list');
            if (extrasListEl) {
                var extras = quote.extras || [];
                var html = '';
                for (var i = 0; i < extras.length; i++) {
                    var e = extras[i];
                    html += '<div class="tb-receipt__row">';
                    html += '<span class="tb-receipt__label">' + TB.Utils.escapeHtml(e.name);
                    if (e.quantity > 1) html += ' &times; ' + e.quantity;
                    html += '</span>';
                    html += '<span class="tb-receipt__value">' + TB.Utils.formatPrice(e.price, currency) + '</span>';
                    html += '</div>';
                }
                extrasListEl.innerHTML = html;
            }

            // Round trip
            var rtRow = document.getElementById('tb-receipt-roundtrip-row');
            if (rtRow) {
                rtRow.style.display = (quote.is_round_trip || state.isRoundTrip) ? '' : 'none';
            }

            // Total
            setEl('tb-receipt-total', TB.Utils.formatPrice(state.totalPrice, currency));

            // Download receipt handler
            var dlBtn = document.getElementById('tb-download-receipt');
            if (dlBtn) {
                dlBtn.onclick = function () {
                    TB.Step3.downloadReceipt(state, gatewayLabel);
                };
            }

            TB.Wizard.showConfirmation();
        },

        downloadReceipt: function (state, gatewayLabel) {
            var vehicle = state.selectedVehicle;
            var quote = state.quoteData || {};
            var currency = state.currency || 'MAD';
            var basePrice = quote.base_price || (vehicle ? vehicle.price : 0);
            var extras = quote.extras || [];
            var isRoundTrip = quote.is_round_trip || state.isRoundTrip;

            var html = '<!DOCTYPE html><html><head><meta charset="utf-8">'
                + '<title>Receipt ' + TB.Utils.escapeHtml(state.bookingRef || '') + '</title>'
                + '<style>'
                + 'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:40px auto;padding:0 20px;color:#1a1a2e;}'
                + '.logo{text-align:center;font-size:1.5rem;font-weight:700;margin-bottom:8px;}'
                + '.subtitle{text-align:center;color:#6c757d;margin-bottom:32px;font-size:0.9rem;}'
                + '.ref{text-align:center;font-size:1.3rem;font-weight:700;color:#e94560;margin-bottom:24px;}'
                + 'table{width:100%;border-collapse:collapse;}'
                + 'td{padding:10px 0;border-bottom:1px solid #eee;}'
                + 'td:first-child{color:#6c757d;width:40%;}'
                + 'td:last-child{text-align:right;font-weight:500;}'
                + '.divider td{border-bottom:2px solid #ddd;padding:0;}'
                + '.total td{border-bottom:none;border-top:2px solid #1a1a2e;font-size:1.1rem;font-weight:700;}'
                + '.footer{text-align:center;color:#6c757d;font-size:0.8rem;margin-top:32px;}'
                + '@media print{body{margin:0;} .no-print{display:none;}}'
                + '</style></head><body>'
                + '<div class="logo">Transfers.ma</div>'
                + '<div class="subtitle">Booking Receipt</div>'
                + '<div class="ref">' + TB.Utils.escapeHtml(state.bookingRef || '') + '</div>'
                + '<table>'
                + '<tr><td>Date & Time</td><td>' + TB.Utils.escapeHtml(TB.Utils.formatDateTime(state.pickupDatetime)) + '</td></tr>'
                + '<tr><td>Pickup</td><td>' + TB.Utils.escapeHtml(state.pickupAddress || '') + '</td></tr>'
                + '<tr><td>Drop-off</td><td>' + TB.Utils.escapeHtml(state.dropoffAddress || '') + '</td></tr>'
                + '<tr><td>Vehicle</td><td>' + TB.Utils.escapeHtml(vehicle ? vehicle.category_name : '--') + '</td></tr>'
                + '<tr><td>Passengers</td><td>' + (state.passengers || 1) + '</td></tr>'
                + '<tr class="divider"><td colspan="2"></td></tr>'
                + '<tr><td>Base price</td><td>' + TB.Utils.escapeHtml(TB.Utils.formatPrice(basePrice, currency)) + '</td></tr>';

            for (var i = 0; i < extras.length; i++) {
                var e = extras[i];
                var label = e.name;
                if (e.quantity > 1) label += ' x ' + e.quantity;
                html += '<tr><td>' + TB.Utils.escapeHtml(label) + '</td><td>' + TB.Utils.escapeHtml(TB.Utils.formatPrice(e.price, currency)) + '</td></tr>';
            }

            if (isRoundTrip) {
                html += '<tr><td>Round trip</td><td>&times; 2</td></tr>';
            }

            html += '<tr class="total"><td>Total</td><td>' + TB.Utils.escapeHtml(TB.Utils.formatPrice(state.totalPrice, currency)) + '</td></tr>'
                + '<tr><td>Payment</td><td>' + TB.Utils.escapeHtml(gatewayLabel) + '</td></tr>'
                + '</table>'
                + '<div class="footer">Thank you for booking with Transfers.ma<br>support@transfers.ma</div>'
                + '</body></html>';

            var blob = new Blob([html], { type: 'text/html' });
            var url = URL.createObjectURL(blob);
            var win = window.open(url, '_blank');
            if (win) {
                win.onload = function () {
                    win.print();
                    URL.revokeObjectURL(url);
                };
            }
        }
    };
})();
