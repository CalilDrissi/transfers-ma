(function () {
    'use strict';
    window.TB = window.TB || {};
    var stripe = null;
    var elements = null;
    var paymentElement = null;

    // Local payment state
    var payState = {
        selectedGateway: null,
        selectedPaymentMode: null, // 'full' or 'deposit'
        coupon: null,
        discount: 0,
        depositPct: 0,
        depositAmount: 0,
        remaining: 0,
        totalBeforeDiscount: 0,
        total: 0
    };

    TB.Step3 = {
        init: function () {
            // Reset payment state on each init
            payState.selectedGateway = null;
            payState.selectedPaymentMode = null;
            payState.coupon = null;
            payState.discount = 0;
            this.computeTotal();
            this.renderOrderSummary();
            this.restoreCustomerInfo();
            this.initStripe();
            this.bindEvents();
            this.resetPaymentUI();
            this.loadGateways();
            this.initCoupon();
            this.handlePayPalReturn();
        },
        initStripe: function () {
            if (!tbConfig.stripePublishableKey) return;
            if (!stripe) stripe = Stripe(tbConfig.stripePublishableKey);
        },
        bindEvents: function () {
            var self = this;
            var backBtns = document.querySelectorAll('#tb-step-3 .tb-btn-back');
            for (var i = 0; i < backBtns.length; i++) {
                backBtns[i].addEventListener('click', function () { TB.Wizard.showStep(2); });
            }
            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn) payBtn.addEventListener('click', function () { self.submitBooking(); });
            var confirmBtn = document.getElementById('tb-confirm-payment-btn');
            if (confirmBtn) confirmBtn.addEventListener('click', function () { self.confirmStripePayment(); });
            var fields = ['tb-customer-first-name', 'tb-customer-last-name', 'tb-customer-email', 'tb-customer-phone', 'tb-customer-whatsapp', 'tb-special-requests'];
            for (var j = 0; j < fields.length; j++) {
                var el = document.getElementById(fields[j]);
                if (el) el.addEventListener('input', function () { self.saveCustomerInfo(); });
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
            if (phone) TB.State.set('customerPhone', phone.value.trim());
            if (whatsapp) TB.State.set('customerWhatsapp', whatsapp.value.trim());
            if (requests) TB.State.set('specialRequests', requests.value.trim());
        },

        /* ── Total computation ── */
        computeTotal: function () {
            var state = TB.State.getAll();
            var quoteData = state.quoteData;
            var t;
            if (quoteData && quoteData.total_price) {
                t = parseFloat(quoteData.total_price);
            } else {
                var v = state.selectedVehicle;
                var basePrice = v ? v.price : 0;
                var extrasTotal = 0;
                var se = state.selectedExtras || [];
                for (var j = 0; j < se.length; j++) extrasTotal += se[j].price * (se[j].is_per_item ? se[j].quantity : 1);
                t = basePrice + extrasTotal;
                if (state.isRoundTrip) t *= 2;
            }
            payState.totalBeforeDiscount = t;
            // Deposit percentage from pricing data
            var pricingData = state.pricingData;
            if (pricingData && pricingData.deposit_percentage) {
                payState.depositPct = parseFloat(pricingData.deposit_percentage);
            }
            this.recalcTotal();
        },

        recalcTotal: function () {
            var t = payState.totalBeforeDiscount - payState.discount;
            if (t < 0) t = 0;
            payState.total = t;
            if (payState.depositPct > 0 && payState.selectedPaymentMode === 'deposit') {
                payState.depositAmount = Math.round(t * payState.depositPct / 100);
                payState.remaining = t - payState.depositAmount;
            } else {
                payState.depositAmount = t;
                payState.remaining = 0;
            }
        },

        renderOrderSummary: function () {
            var state = TB.State.getAll();
            // Hidden compat elements
            var route = document.getElementById('tb-order-route');
            var datetime = document.getElementById('tb-order-datetime');
            if (route) route.textContent = TB.Utils.shortName(state.pickupAddress) + ' \u2192 ' + TB.Utils.shortName(state.dropoffAddress);
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
            this.updateSidebarTotals();
        },

        updateSidebarTotals: function () {
            var total = document.getElementById('tb-order-total');
            if (total) total.textContent = TB.Utils.formatPrice(payState.total);

            // Discount row
            var discountRow = document.getElementById('tb-order-discount-row');
            if (discountRow) {
                if (payState.discount > 0) {
                    discountRow.style.display = 'flex';
                    var discLabel = document.getElementById('tb-order-discount-label');
                    var discValue = document.getElementById('tb-order-discount-value');
                    if (discLabel) discLabel.textContent = payState.coupon ? payState.coupon.code : (tbConfig.i18n.discount || 'Discount');
                    if (discValue) discValue.textContent = '-' + TB.Utils.formatPrice(payState.discount);
                } else {
                    discountRow.style.display = 'none';
                }
            }

            // Deposit rows
            var depositRow = document.getElementById('tb-order-deposit-row');
            var remainingRow = document.getElementById('tb-order-remaining-row');
            if (payState.remaining > 0) {
                if (depositRow) {
                    depositRow.style.display = 'flex';
                    var depEl = document.getElementById('tb-order-deposit');
                    if (depEl) depEl.textContent = TB.Utils.formatPrice(payState.depositAmount);
                }
                if (remainingRow) {
                    remainingRow.style.display = 'flex';
                    var remEl = document.getElementById('tb-order-remaining');
                    if (remEl) remEl.textContent = TB.Utils.formatPrice(payState.remaining);
                }
            } else {
                if (depositRow) depositRow.style.display = 'none';
                if (remainingRow) remainingRow.style.display = 'none';
            }

            // Update pay button text
            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn) {
                var amt = payState.remaining > 0 ? payState.depositAmount : payState.total;
                payBtn.textContent = (tbConfig.i18n.payNow || 'Pay Now') + ' — ' + TB.Utils.formatPrice(amt);
            }
        },

        resetPaymentUI: function () {
            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn) { payBtn.style.display = 'none'; payBtn.disabled = false; payBtn.classList.remove('tb-btn--loading'); }
            var stripeC = document.getElementById('tb-stripe-container');
            if (stripeC) stripeC.style.display = 'none';
            var paypalC = document.getElementById('tb-paypal-container');
            if (paypalC) paypalC.style.display = 'none';
            var cashC = document.getElementById('tb-cash-container');
            if (cashC) cashC.style.display = 'none';
            var confirmBtn = document.getElementById('tb-confirm-payment-btn');
            if (confirmBtn) confirmBtn.style.display = 'none';
            TB.Utils.hideAlert('tb-payment-errors');
        },

        /* ── Gateway loading ── */
        loadGateways: function () {
            var container = document.getElementById('tb-gateways-container');
            TB.API.getGateways().then(function (data) {
                var gateways = Array.isArray(data) ? data : (data && data.results ? data.results : []);
                TB.Step3.renderGateways(gateways);
            }).catch(function () {
                if (container) container.innerHTML = '<p class="tb-alert tb-alert--error">' + TB.Utils.escapeHtml(tbConfig.i18n.errorGeneric) + '</p>';
            });
        },

        renderGateways: function (gateways) {
            var container = document.getElementById('tb-gateways-container');
            if (!container) return;
            container.innerHTML = '';
            var hasDeposit = payState.depositPct > 0;
            var options = [];
            var i18n = tbConfig.i18n;

            for (var i = 0; i < gateways.length; i++) {
                var gw = gateways[i];
                if (!gw.is_active) continue;
                var gwType = gw.gateway_type;

                if (gwType === 'stripe' || gwType === 'paypal') {
                    options.push({ gateway: gwType, mode: 'full', label: gw.display_name || gw.name, description: i18n.payFull || 'Pay full amount' });
                    if (hasDeposit) {
                        options.push({
                            gateway: gwType, mode: 'deposit',
                            label: (gw.display_name || gw.name) + ' (' + (i18n.depositOnly || 'deposit') + ')',
                            description: (i18n.payDeposit || 'Pay deposit') + ' — ' + (i18n.remainingToDriver || 'remaining to driver')
                        });
                    }
                } else if (gwType === 'cash') {
                    options.push({ gateway: 'cash', mode: 'full', label: gw.display_name || (i18n.payCash || 'Pay Cash to Driver'), description: gw.description || (i18n.cashDescription || 'Pay the full amount to your driver in cash') });
                }
            }

            if (options.length === 0) {
                container.innerHTML = '<p>' + TB.Utils.escapeHtml(tbConfig.i18n.errorGeneric) + '</p>';
                return;
            }

            var self = this;
            for (var j = 0; j < options.length; j++) {
                var opt = options[j];
                var el = document.createElement('div');
                el.className = 'tb-gateway-option';
                el.setAttribute('data-gateway', opt.gateway);
                el.setAttribute('data-mode', opt.mode);
                el.innerHTML =
                    '<div class="tb-gateway-option__radio"></div>' +
                    '<div class="tb-gateway-option__info">' +
                        '<div class="tb-gateway-option__label">' + TB.Utils.escapeHtml(opt.label) + '</div>' +
                        '<div class="tb-gateway-option__desc">' + TB.Utils.escapeHtml(opt.description) + '</div>' +
                    '</div>';
                el.addEventListener('click', (function (option, element) {
                    return function () { self.selectGateway(option, element); };
                })(opt, el));
                container.appendChild(el);
            }
        },

        selectGateway: function (option, element) {
            var all = document.querySelectorAll('.tb-gateway-option');
            for (var i = 0; i < all.length; i++) all[i].classList.remove('tb-gateway-option--selected');
            element.classList.add('tb-gateway-option--selected');

            payState.selectedGateway = option.gateway;
            payState.selectedPaymentMode = option.mode;

            // Toggle containers
            var stripeC = document.getElementById('tb-stripe-container');
            var paypalC = document.getElementById('tb-paypal-container');
            var cashC = document.getElementById('tb-cash-container');
            var payBtn = document.getElementById('tb-pay-button');
            var confirmBtn = document.getElementById('tb-confirm-payment-btn');
            if (stripeC) stripeC.style.display = 'none';
            if (paypalC) paypalC.style.display = 'none';
            if (cashC) cashC.style.display = 'none';
            if (confirmBtn) confirmBtn.style.display = 'none';

            if (option.gateway === 'stripe') {
                if (stripeC) stripeC.style.display = 'block';
            } else if (option.gateway === 'paypal') {
                if (paypalC) paypalC.style.display = 'block';
            } else if (option.gateway === 'cash') {
                if (cashC) cashC.style.display = 'block';
            }

            if (payBtn) payBtn.style.display = 'block';

            this.recalcTotal();
            this.updateSidebarTotals();
        },

        /* ── Coupon ── */
        initCoupon: function () {
            var self = this;
            var applyBtn = document.getElementById('tb-coupon-apply');
            var removeBtn = document.getElementById('tb-coupon-remove');
            var codeInput = document.getElementById('tb-coupon-code');

            if (applyBtn) {
                applyBtn.addEventListener('click', function () {
                    var code = codeInput ? codeInput.value.trim() : '';
                    if (!code) return;
                    TB.Utils.setButtonLoading(applyBtn, true);

                    TB.API.validateCoupon({
                        code: code,
                        booking_type: 'transfer',
                        amount: payState.totalBeforeDiscount
                    }).then(function (data) {
                        TB.Utils.setButtonLoading(applyBtn, false);
                        if (data.valid) {
                            payState.coupon = { code: code, data: data };
                            payState.discount = parseFloat(data.discount_amount) || 0;
                            // Show success
                            var successEl = document.getElementById('tb-coupon-success');
                            var msgEl = document.getElementById('tb-coupon-message');
                            var errorEl = document.getElementById('tb-coupon-error');
                            var inputRow = document.getElementById('tb-coupon-input-row');
                            if (errorEl) errorEl.style.display = 'none';
                            if (successEl) successEl.style.display = 'block';
                            if (msgEl) msgEl.textContent = code + ' — ' + (data.message || ('-' + TB.Utils.formatPrice(payState.discount)));
                            if (inputRow) inputRow.style.display = 'none';
                            self.recalcTotal();
                            self.updateSidebarTotals();
                        } else {
                            self.showCouponError(data.message || (tbConfig.i18n.invalidCoupon || 'Invalid coupon code'));
                        }
                    }).catch(function (err) {
                        TB.Utils.setButtonLoading(applyBtn, false);
                        self.showCouponError(err.message || tbConfig.i18n.errorGeneric);
                    });
                });
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', function () {
                    payState.coupon = null;
                    payState.discount = 0;
                    var successEl = document.getElementById('tb-coupon-success');
                    var errorEl = document.getElementById('tb-coupon-error');
                    var inputRow = document.getElementById('tb-coupon-input-row');
                    if (successEl) successEl.style.display = 'none';
                    if (errorEl) errorEl.style.display = 'none';
                    if (inputRow) inputRow.style.display = 'flex';
                    if (codeInput) codeInput.value = '';
                    self.recalcTotal();
                    self.updateSidebarTotals();
                });
            }
        },

        showCouponError: function (msg) {
            var successEl = document.getElementById('tb-coupon-success');
            var errorEl = document.getElementById('tb-coupon-error');
            if (successEl) successEl.style.display = 'none';
            if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
        },

        /* ── Validation ── */
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
            if (!email || !TB.Utils.validateEmail(email)) errors.push({ field: 'email', msg: tbConfig.i18n.invalidEmail });
            if (!phone || !TB.Utils.validatePhone(phone)) errors.push({ field: 'phone', msg: tbConfig.i18n.invalidPhone });
            if (!payState.selectedGateway) {
                TB.Utils.showAlert('tb-payment-errors', tbConfig.i18n.selectPayment || 'Please select a payment method');
                errors.push({ field: '_gateway', msg: '' });
            }
            for (var i = 0; i < errors.length; i++) {
                if (errors[i].field !== '_gateway') TB.Utils.showFieldError(errors[i].field, errors[i].msg);
            }
            return errors.length === 0;
        },

        /* ── Submit booking ── */
        submitBooking: function () {
            if (!this.validate()) return;
            this.saveCustomerInfo();
            TB.Utils.hideAlert('tb-payment-errors');
            var payBtn = document.getElementById('tb-pay-button');
            TB.Utils.setButtonLoading(payBtn, true);

            var state = TB.State.getAll();
            var extrasPayload = [];
            var se = state.selectedExtras || [];
            for (var i = 0; i < se.length; i++) extrasPayload.push({ extra_id: se[i].id, quantity: se[i].quantity });
            var bookingData = {
                customer_name: state.customerName, customer_email: state.customerEmail,
                customer_phone: state.customerPhone, transfer_type: state.transferType,
                pickup_address: state.pickupAddress, pickup_latitude: state.pickupLat,
                pickup_longitude: state.pickupLng, dropoff_address: state.dropoffAddress,
                dropoff_latitude: state.dropoffLat, dropoff_longitude: state.dropoffLng,
                pickup_datetime: state.pickupDatetime, passengers: state.passengers,
                luggage: state.luggage || state.passengers, vehicle_category_id: state.selectedVehicle.category_id,
                flight_number: state.flightNumber || '', special_requests: state.specialRequests || '',
                is_round_trip: state.isRoundTrip, extras: extrasPayload
            };
            if (state.isRoundTrip && state.returnDatetime) bookingData.return_datetime = state.returnDatetime;

            var gateway = payState.selectedGateway;
            var self = this;

            TB.API.createBooking(bookingData)
                .then(function (booking) {
                    TB.State.set('bookingId', booking.id);
                    TB.State.set('bookingRef', booking.booking_ref);
                    TB.State.set('totalPrice', booking.total_price);
                    TB.State.set('currency', booking.currency);
                    TB.State.save();

                    // Create payment with full data
                    var paymentData = {
                        booking_type: 'transfer',
                        booking_id: booking.id,
                        gateway_type: gateway,
                        return_url: window.location.href.split('?')[0] + '?paypal_return=1&ref=' + booking.booking_ref,
                        cancel_url: window.location.href
                    };
                    if (payState.coupon) paymentData.coupon_code = payState.coupon.code;
                    return TB.API.createPayment(paymentData);
                })
                .then(function (paymentData) {
                    TB.State.set('paymentRef', paymentData.payment_ref);
                    TB.State.save();

                    if (gateway === 'stripe') {
                        TB.Utils.setButtonLoading(payBtn, false);
                        self.mountStripeElements(paymentData.client_secret);
                    } else if (gateway === 'paypal') {
                        self.handlePayPalPayment(paymentData);
                    } else if (gateway === 'cash') {
                        self.handleCashPayment(paymentData);
                    }
                })
                .catch(function (err) {
                    TB.Utils.setButtonLoading(payBtn, false);
                    TB.Utils.showAlert('tb-payment-errors', err.message || tbConfig.i18n.errorGeneric);
                });
        },

        /* ── Stripe ── */
        mountStripeElements: function (clientSecret) {
            if (!stripe) { TB.Utils.showAlert('tb-payment-errors', 'Stripe is not configured.'); return; }
            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn) payBtn.style.display = 'none';
            var stripeContainer = document.getElementById('tb-stripe-element');
            stripeContainer.innerHTML = '';
            var stripeC = document.getElementById('tb-stripe-container');
            if (stripeC) stripeC.style.display = 'block';
            elements = stripe.elements({ clientSecret: clientSecret });
            paymentElement = elements.create('payment');
            paymentElement.mount('#tb-stripe-element');
            document.getElementById('tb-confirm-payment-btn').style.display = 'block';
        },

        confirmStripePayment: function () {
            var confirmBtn = document.getElementById('tb-confirm-payment-btn');
            TB.Utils.setButtonLoading(confirmBtn, true);
            TB.Utils.hideAlert('tb-payment-errors');
            stripe.confirmPayment({ elements: elements, confirmParams: {}, redirect: 'if_required' })
                .then(function (result) {
                    if (result.error) {
                        TB.Utils.setButtonLoading(confirmBtn, false);
                        TB.Utils.showAlert('tb-payment-errors', result.error.message);
                    } else {
                        TB.API.confirmPayment(TB.State.get('paymentRef'))
                            .then(function () { TB.Step3.showConfirmation(); })
                            .catch(function () { TB.Step3.showConfirmation(); });
                    }
                });
        },

        /* ── PayPal ── */
        handlePayPalPayment: function (paymentData) {
            if (paymentData.redirect_url) {
                window.location.href = paymentData.redirect_url;
            } else {
                var payBtn = document.getElementById('tb-pay-button');
                TB.Utils.setButtonLoading(payBtn, false);
                TB.Utils.showAlert('tb-payment-errors', tbConfig.i18n.paymentFailed || 'PayPal setup failed');
            }
        },

        handlePayPalReturn: function () {
            var params = new URLSearchParams(window.location.search);
            if (params.get('paypal_return') !== '1') return;
            var ref = params.get('ref') || '';
            if (!ref) return;

            // Show processing state
            var paymentCard = document.getElementById('tb-payment-card');
            if (paymentCard) paymentCard.innerHTML = '<div class="tb-loading"><span class="tb-spinner"></span> ' + tbConfig.i18n.processing + '</div>';

            TB.API.confirmPayment(ref)
                .then(function () {
                    TB.State.set('bookingRef', ref);
                    TB.Step3.showConfirmation();
                })
                .catch(function () {
                    // PayPal confirmed on their side, webhook will handle it
                    TB.State.set('bookingRef', ref);
                    TB.Step3.showConfirmation();
                });
        },

        /* ── Cash ── */
        handleCashPayment: function (paymentData) {
            TB.API.confirmPayment(paymentData.payment_ref)
                .then(function () { TB.Step3.showConfirmation(); })
                .catch(function () { TB.Step3.showConfirmation(); });
        },

        /* ── Confirmation ── */
        showConfirmation: function () {
            var currentIdx = TB.State.get('currentLegIndex') || 0;
            var legs = TB.State.get('legs') || [];
            if (legs[currentIdx]) {
                legs[currentIdx].bookingId = TB.State.get('bookingId');
                legs[currentIdx].bookingRef = TB.State.get('bookingRef');
                legs[currentIdx].paymentRef = TB.State.get('paymentRef');
                legs[currentIdx].totalPrice = TB.State.get('totalPrice');
                TB.State.set('legs', legs);
                TB.State.save();
            }
            TB.Wizard.onLegComplete();
        }
    };
})();
