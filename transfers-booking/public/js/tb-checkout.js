/**
 * Checkout page — passenger details, coupon, payment, booking creation.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n, params, state;

    TB.Checkout = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};

            state = {
                basePrice: 0,
                extras: [],
                extrasTotal: 0,
                coupon: null,
                discount: 0,
                total: 0,
                depositPct: 0,
                depositAmount: 0,
                remaining: 0,
                selectedGateway: null,
                selectedPaymentMode: null, // 'full' or 'deposit'
                stripe: null,
                stripeCard: null,
                bookingId: null,
                bookingRef: null,
                paymentRef: null,
                bookingType: 'transfer'
            };

            params = this.parseParams();

            if (!params.from && !params.trip_id) {
                window.location.href = '/';
                return;
            }

            state.bookingType = params.type === 'trip' ? 'trip' : 'transfer';

            this.populateOrderSummary();
            this.initBackLink();
            this.initFlightField();
            this.loadPaymentGateways();
            this.initCoupon();
            this.initSubmit();

            // Check for PayPal return
            if (this.getUrlParam('paypal_return') === '1') {
                this.handlePayPalReturn();
            }
        },

        /* ── Parse URL params ─────────────────── */

        parseParams: function () {
            var sp = new URLSearchParams(window.location.search);
            return {
                type: sp.get('type') || 'transfer',
                from: sp.get('from') || '',
                from_lat: sp.get('from_lat') || '',
                from_lng: sp.get('from_lng') || '',
                to: sp.get('to') || '',
                to_lat: sp.get('to_lat') || '',
                to_lng: sp.get('to_lng') || '',
                date: sp.get('date') || '',
                return_date: sp.get('return_date') || '',
                passengers: parseInt(sp.get('passengers'), 10) || 2,
                luggage: parseInt(sp.get('luggage'), 10) || 0,
                adults: parseInt(sp.get('adults'), 10) || 2,
                children: parseInt(sp.get('children'), 10) || 0,
                vehicle_id: sp.get('vehicle_id') || '',
                category_id: sp.get('category_id') || '',
                price: parseFloat(sp.get('price')) || 0,
                currency: sp.get('currency') || cfg.currencySymbol || 'MAD',
                deposit_percentage: parseFloat(sp.get('deposit_percentage')) || 0,
                extras: sp.get('extras') || '',
                route_id: sp.get('route_id') || '',
                trip_id: sp.get('trip_id') || '',
                trip_name: sp.get('trip_name') || '',
                is_private: sp.get('is_private') === '1'
            };
        },

        getUrlParam: function (key) {
            return new URLSearchParams(window.location.search).get(key) || '';
        },

        /* ── Populate order summary ───────────── */

        populateOrderSummary: function () {
            var currency = params.currency;
            state.basePrice = params.price;
            state.depositPct = params.deposit_percentage;

            // Route
            setText('tb-checkout-summary-from', shortName(params.from || params.trip_name));
            setText('tb-checkout-summary-to', shortName(params.to));

            // Date
            setText('tb-checkout-summary-date', formatDateTime(params.date));

            // Return
            if (params.return_date) {
                show('tb-checkout-summary-return-row');
                setText('tb-checkout-summary-return', formatDateTime(params.return_date));
            }

            // Vehicle / participants
            var vLabel = params.type === 'trip'
                ? (params.trip_name || (i18n.dayTrips || 'Day Trip'))
                : (params.category_id ? (i18n.vehicle || 'Vehicle') + ' #' + params.category_id : '--');
            setText('tb-checkout-summary-vehicle', vLabel);

            var paxLabel = params.passengers + ' ' + (i18n.passengersLabel || 'passengers');
            if (params.luggage > 0) paxLabel += ', ' + params.luggage + ' ' + (i18n.bagsLabel || 'bags');
            setText('tb-checkout-summary-pax', paxLabel);

            // Parse extras
            if (params.extras) {
                try {
                    state.extras = JSON.parse(params.extras);
                } catch (e) {
                    state.extras = [];
                }
            }

            this.updateOrderSummary();
        },

        updateOrderSummary: function () {
            var currency = params.currency;
            var base = state.basePrice;
            var extrasTotal = state.extrasTotal;
            var discount = state.discount;
            var total = base + extrasTotal - discount;
            if (total < 0) total = 0;
            state.total = total;

            setText('tb-checkout-summary-base', formatPrice(base, currency));
            setText('tb-checkout-summary-total', formatPrice(total, currency));

            // Discount line
            if (discount > 0) {
                show('tb-checkout-summary-discount-line');
                var couponLabel = state.coupon ? state.coupon.code : (i18n.discount || 'Discount');
                setText('tb-checkout-summary-discount-label', couponLabel);
                setText('tb-checkout-summary-discount-value', '-' + formatPrice(discount, currency));
            } else {
                hide('tb-checkout-summary-discount-line');
            }

            // Deposit
            if (state.depositPct > 0 && state.selectedPaymentMode === 'deposit') {
                state.depositAmount = Math.round(total * state.depositPct / 100);
                state.remaining = total - state.depositAmount;
                show('tb-checkout-summary-deposit-row');
                setText('tb-checkout-summary-deposit', formatPrice(state.depositAmount, currency));
                setText('tb-checkout-summary-remaining', formatPrice(state.remaining, currency));
            } else {
                state.depositAmount = total;
                state.remaining = 0;
                hide('tb-checkout-summary-deposit-row');
            }

            // Remaining note
            if (state.remaining > 0) {
                show('tb-checkout-remaining');
                setText('tb-checkout-remaining-text',
                    (i18n.remainingToDriver || 'Remaining') + ' ' + formatPrice(state.remaining, currency) + ' ' + (i18n.toDriver || 'to driver'));
            } else {
                hide('tb-checkout-remaining');
            }
        },

        /* ── Back link ────────────────────────── */

        initBackLink: function () {
            var backEl = document.getElementById('tb-checkout-back');
            if (backEl) {
                backEl.addEventListener('click', function (e) {
                    e.preventDefault();
                    window.history.back();
                });
            }
        },

        /* ── Flight field ─────────────────────── */

        initFlightField: function () {
            var fromLower = (params.from || '').toLowerCase();
            var toLower = (params.to || '').toLowerCase();
            if (fromLower.indexOf('airport') !== -1 || toLower.indexOf('airport') !== -1 ||
                fromLower.indexOf('aeroport') !== -1 || toLower.indexOf('aeroport') !== -1 ||
                fromLower.indexOf('aéroport') !== -1 || toLower.indexOf('aéroport') !== -1) {
                show('tb-checkout-flight-field');
            }
        },

        /* ── Payment gateways ─────────────────── */

        loadPaymentGateways: function () {
            var self = this;
            TB.API._call('get_gateways', {}).then(function (data) {
                var gateways = Array.isArray(data) ? data : (data && data.results ? data.results : []);
                self.renderGateways(gateways);
            }).catch(function () {
                var container = document.getElementById('tb-checkout-gateways');
                if (container) {
                    container.innerHTML = '<p style="color:#EF4444">' + escapeHtml(i18n.errorGeneric || 'Failed to load payment methods.') + '</p>';
                }
            });
        },

        renderGateways: function (gateways) {
            var container = document.getElementById('tb-checkout-gateways');
            if (!container) return;
            container.innerHTML = '';

            var hasDeposit = state.depositPct > 0;
            var self = this;
            var options = [];

            for (var i = 0; i < gateways.length; i++) {
                var gw = gateways[i];
                if (!gw.is_active) continue;

                var gwType = gw.gateway_type;

                if (gwType === 'stripe' || gwType === 'paypal') {
                    options.push({ gateway: gwType, mode: 'full', label: gw.display_name || gw.name, description: i18n.payFull || 'Pay full amount', icon: gwType });
                    if (hasDeposit) {
                        var depAmt = Math.round(state.basePrice * state.depositPct / 100);
                        options.push({
                            gateway: gwType,
                            mode: 'deposit',
                            label: (gw.display_name || gw.name) + ' (' + (i18n.depositOnly || 'deposit') + ')',
                            description: (i18n.payDeposit || 'Pay deposit') + ' — ' + (i18n.remainingToDriver || 'remaining to driver'),
                            icon: gwType
                        });
                    }
                } else if (gwType === 'cash') {
                    options.push({ gateway: 'cash', mode: 'full', label: gw.display_name || (i18n.payCash || 'Pay Cash to Driver'), description: gw.description || (i18n.cashDescription || 'Pay the full amount to your driver in cash'), icon: 'cash' });
                }
            }

            for (var j = 0; j < options.length; j++) {
                var opt = options[j];
                var el = document.createElement('div');
                el.className = 'tb-checkout__gateway-option';
                el.setAttribute('data-gateway', opt.gateway);
                el.setAttribute('data-mode', opt.mode);

                el.innerHTML =
                    '<div class="tb-checkout__gateway-radio"></div>' +
                    '<div class="tb-checkout__gateway-info">' +
                        '<div class="tb-checkout__gateway-label">' + escapeHtml(opt.label) + '</div>' +
                        '<div class="tb-checkout__gateway-description">' + escapeHtml(opt.description) + '</div>' +
                    '</div>';

                el.addEventListener('click', (function (option, element) {
                    return function () {
                        self.selectGateway(option, element);
                    };
                })(opt, el));

                container.appendChild(el);
            }

            // Enable submit once gateways loaded
            var submitBtn = document.getElementById('tb-checkout-submit');
            if (submitBtn && options.length > 0) {
                submitBtn.disabled = false;
            }
        },

        selectGateway: function (option, element) {
            // Remove previous selection
            var all = document.querySelectorAll('.tb-checkout__gateway-option');
            for (var i = 0; i < all.length; i++) {
                all[i].classList.remove('tb-checkout__gateway-option--selected');
            }
            element.classList.add('tb-checkout__gateway-option--selected');

            state.selectedGateway = option.gateway;
            state.selectedPaymentMode = option.mode;

            // Toggle payment containers
            var stripeC = document.getElementById('tb-checkout-stripe-container');
            var paypalC = document.getElementById('tb-checkout-paypal-container');
            var cashC = document.getElementById('tb-checkout-cash-container');
            var submitBtn = document.getElementById('tb-checkout-submit');

            stripeC.style.display = 'none';
            paypalC.style.display = 'none';
            cashC.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'flex';

            if (option.gateway === 'stripe') {
                stripeC.style.display = 'block';
                this.initStripe();
            } else if (option.gateway === 'paypal') {
                paypalC.style.display = 'block';
                if (submitBtn) submitBtn.style.display = 'none';
                this.initPayPal();
            } else if (option.gateway === 'cash') {
                cashC.style.display = 'block';
            }

            this.updateOrderSummary();
        },

        /* ── Stripe ───────────────────────────── */

        initStripe: function () {
            if (state.stripe) return;
            if (!cfg.stripePublishableKey) return;

            state.stripe = Stripe(cfg.stripePublishableKey);
            var elements = state.stripe.elements();
            state.stripeCard = elements.create('card', {
                style: {
                    base: {
                        fontSize: '15px',
                        color: '#1E293B',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        '::placeholder': { color: '#94A3B8' }
                    }
                }
            });
            state.stripeCard.mount('#tb-stripe-element');

            state.stripeCard.on('change', function (event) {
                var errEl = document.getElementById('tb-stripe-errors');
                if (errEl) errEl.textContent = event.error ? event.error.message : '';
            });
        },

        /* ── PayPal ───────────────────────────── */

        initPayPal: function () {
            var container = document.getElementById('tb-paypal-button');
            if (!container || container.children.length > 0) return;

            var self = this;
            container.innerHTML = '<p style="color:#64748B;font-size:13px;text-align:center">' + escapeHtml(i18n.loading || 'Loading...') + '</p>';

            // PayPal buttons rendered after booking creation
            container.innerHTML = '';
            var infoP = document.createElement('p');
            infoP.style.cssText = 'color:#64748B;font-size:13px;text-align:center;padding:12px';
            infoP.textContent = i18n.paypalInfo || 'Click below to pay with PayPal. You will be redirected to complete payment.';
            container.appendChild(infoP);

            var ppBtn = document.createElement('button');
            ppBtn.type = 'button';
            ppBtn.className = 'tb-checkout__submit';
            ppBtn.style.cssText = 'background:#FFC439;color:#003087;margin-top:8px';
            ppBtn.textContent = i18n.payWithPaypal || 'Pay with PayPal';
            ppBtn.addEventListener('click', function () {
                self.handleSubmit();
            });
            container.appendChild(ppBtn);
        },

        /* ── Coupon ───────────────────────────── */

        initCoupon: function () {
            var self = this;
            var applyBtn = document.getElementById('tb-checkout-coupon-apply');
            var removeBtn = document.getElementById('tb-checkout-coupon-remove');
            var codeInput = document.getElementById('tb-checkout-coupon-code');

            if (applyBtn) {
                applyBtn.addEventListener('click', function () {
                    var code = codeInput ? codeInput.value.trim() : '';
                    if (!code) return;

                    applyBtn.disabled = true;
                    applyBtn.textContent = i18n.processing || 'Processing...';

                    TB.API._call('validate_coupon', {
                        code: code,
                        booking_type: state.bookingType,
                        amount: state.basePrice + state.extrasTotal
                    }).then(function (data) {
                        applyBtn.disabled = false;
                        applyBtn.textContent = i18n.apply || 'Apply';

                        if (data.valid) {
                            state.coupon = { code: code, data: data };
                            state.discount = parseFloat(data.discount_amount) || 0;

                            // Show success
                            hide('tb-checkout-coupon-error');
                            show('tb-checkout-coupon-success');
                            var msg = code + ' — ' + (data.message || ('-' + formatPrice(state.discount, params.currency)));
                            setText('tb-checkout-coupon-message', msg);

                            // Hide input row
                            var inputRow = document.querySelector('.tb-checkout__coupon-input-row');
                            if (inputRow) inputRow.style.display = 'none';

                            self.updateOrderSummary();
                        } else {
                            self.showCouponError(data.message || (i18n.invalidCoupon || 'Invalid coupon code'));
                        }
                    }).catch(function (err) {
                        applyBtn.disabled = false;
                        applyBtn.textContent = i18n.apply || 'Apply';
                        self.showCouponError(err.message || (i18n.errorGeneric || 'Something went wrong'));
                    });
                });
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    state.coupon = null;
                    state.discount = 0;
                    hide('tb-checkout-coupon-success');
                    hide('tb-checkout-coupon-error');
                    var inputRow = document.querySelector('.tb-checkout__coupon-input-row');
                    if (inputRow) inputRow.style.display = 'flex';
                    if (codeInput) codeInput.value = '';
                    self.updateOrderSummary();
                });
            }
        },

        showCouponError: function (msg) {
            hide('tb-checkout-coupon-success');
            var errEl = document.getElementById('tb-checkout-coupon-error');
            if (errEl) {
                errEl.textContent = msg;
                errEl.style.display = 'block';
            }
        },

        /* ── Validation ───────────────────────── */

        validateForm: function () {
            var valid = true;
            clearFieldErrors();

            var name = val('tb-checkout-name');
            var email = val('tb-checkout-email');
            var phone = val('tb-checkout-phone');

            if (!name) {
                showFieldError('name', i18n.required || 'Required');
                valid = false;
            }
            if (!email || !TB.Utils.validateEmail(email)) {
                showFieldError('email', i18n.invalidEmail || 'Please enter a valid email');
                valid = false;
            }
            if (!phone || phone.length < 6) {
                showFieldError('phone', i18n.invalidPhone || 'Please enter a valid phone number');
                valid = false;
            }
            if (!state.selectedGateway) {
                this.showAlert(i18n.selectPayment || 'Please select a payment method');
                valid = false;
            }

            return valid;
        },

        showAlert: function (msg) {
            var el = document.getElementById('tb-checkout-alert');
            if (el) {
                el.textContent = msg;
                el.style.display = 'block';
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        hideAlert: function () {
            var el = document.getElementById('tb-checkout-alert');
            if (el) el.style.display = 'none';
        },

        /* ── Submit ───────────────────────────── */

        initSubmit: function () {
            var self = this;
            var submitBtn = document.getElementById('tb-checkout-submit');
            if (submitBtn) {
                submitBtn.addEventListener('click', function () {
                    self.handleSubmit();
                });
            }
        },

        handleSubmit: function () {
            if (!this.validateForm()) return;

            this.hideAlert();
            var submitBtn = document.getElementById('tb-checkout-submit');
            setButtonLoading(submitBtn, true);

            var self = this;

            // Step 1: Create booking
            this.createBooking().then(function (booking) {
                state.bookingId = booking.id;
                state.bookingRef = booking.booking_ref;

                // Step 2: Create payment
                return self.createPayment();
            }).then(function (payment) {
                state.paymentRef = payment.payment_ref;

                // Step 3: Handle payment by gateway type
                if (state.selectedGateway === 'stripe') {
                    return self.handleStripePayment(payment);
                } else if (state.selectedGateway === 'paypal') {
                    return self.handlePayPalPayment(payment);
                } else if (state.selectedGateway === 'cash') {
                    return self.handleCashPayment(payment);
                }
            }).then(function () {
                // Redirect to confirmation
                self.redirectToConfirmation();
            }).catch(function (err) {
                setButtonLoading(submitBtn, false);
                self.showAlert(err.message || (i18n.errorGeneric || 'Something went wrong. Please try again.'));
            });
        },

        createBooking: function () {
            if (state.bookingType === 'trip') {
                return TB.API._call('create_trip_booking', {
                    trip_id: parseInt(params.trip_id, 10),
                    trip_date: params.date ? params.date.split('T')[0] : '',
                    customer_name: val('tb-checkout-name'),
                    customer_email: val('tb-checkout-email'),
                    customer_phone: '+212' + val('tb-checkout-phone'),
                    adults: params.adults,
                    children: params.children,
                    is_private: params.is_private,
                    pickup_address: val('tb-checkout-pickup-address'),
                    special_requests: val('tb-checkout-requests')
                });
            }

            var bookingData = {
                customer_name: val('tb-checkout-name'),
                customer_email: val('tb-checkout-email'),
                customer_phone: '+212' + val('tb-checkout-phone'),
                transfer_type: 'city_to_city',
                pickup_address: val('tb-checkout-pickup-address') || params.from,
                dropoff_address: params.to,
                pickup_datetime: params.date,
                passengers: params.passengers,
                luggage: params.luggage,
                vehicle_category_id: parseInt(params.category_id, 10) || null,
                special_requests: val('tb-checkout-requests')
            };

            if (params.from_lat) bookingData.pickup_latitude = params.from_lat;
            if (params.from_lng) bookingData.pickup_longitude = params.from_lng;
            if (params.to_lat) bookingData.dropoff_latitude = params.to_lat;
            if (params.to_lng) bookingData.dropoff_longitude = params.to_lng;

            var flight = val('tb-checkout-flight');
            if (flight) bookingData.flight_number = flight;

            if (params.return_date) {
                bookingData.is_round_trip = true;
                bookingData.return_datetime = params.return_date;
            }

            // Extras
            if (state.extras.length > 0) {
                bookingData.extras = state.extras.map(function (id) {
                    return { extra_id: parseInt(id, 10), quantity: 1 };
                });
            }

            return TB.API._call('create_booking', bookingData);
        },

        createPayment: function () {
            var paymentData = {
                booking_type: state.bookingType,
                booking_id: state.bookingId,
                gateway_type: state.selectedGateway,
                return_url: window.location.href.split('?')[0] + '?paypal_return=1&ref=' + state.bookingRef,
                cancel_url: window.location.href
            };

            if (state.coupon) {
                paymentData.coupon_code = state.coupon.code;
            }

            return TB.API._call('create_payment', paymentData);
        },

        handleStripePayment: function (payment) {
            if (!state.stripe || !state.stripeCard || !payment.client_secret) {
                return Promise.reject({ message: i18n.paymentFailed || 'Payment setup failed' });
            }

            var self = this;
            return state.stripe.confirmCardPayment(payment.client_secret, {
                payment_method: { card: state.stripeCard }
            }).then(function (result) {
                if (result.error) {
                    return Promise.reject({ message: result.error.message });
                }
                // Confirm with our API
                return TB.API._call('confirm_payment', { payment_ref: payment.payment_ref });
            });
        },

        handlePayPalPayment: function (payment) {
            if (payment.redirect_url) {
                window.location.href = payment.redirect_url;
                return new Promise(function () {}); // Never resolves, page navigates away
            }
            return Promise.reject({ message: i18n.paymentFailed || 'PayPal setup failed' });
        },

        handleCashPayment: function (payment) {
            return TB.API._call('confirm_payment', { payment_ref: payment.payment_ref });
        },

        /* ── PayPal return ────────────────────── */

        handlePayPalReturn: function () {
            var ref = this.getUrlParam('ref');
            var payerId = this.getUrlParam('PayerID');
            if (!ref) return;

            var self = this;
            var content = document.querySelector('.tb-checkout__forms');
            if (content) content.innerHTML = '<div style="text-align:center;padding:40px"><div class="tb-checkout__spinner" style="border:3px solid #E2E8F0;border-top-color:#2E8BFF;width:40px;height:40px;margin:0 auto 16px"></div><p>' + escapeHtml(i18n.processing || 'Processing payment...') + '</p></div>';

            // Find the payment ref from the booking
            TB.API._call('get_booking_by_ref', { _path_suffix: ref }).then(function () {
                // Confirm payment
                return TB.API._call('confirm_payment', { payment_ref: ref, payer_id: payerId });
            }).then(function () {
                self.redirectToConfirmation(ref);
            }).catch(function (err) {
                if (content) content.innerHTML = '<div style="text-align:center;padding:40px;color:#EF4444"><p>' + escapeHtml(err.message || 'Payment confirmation failed') + '</p></div>';
            });
        },

        /* ── Redirect ─────────────────────────── */

        redirectToConfirmation: function (ref) {
            var confirmUrl = cfg.confirmationPageUrl || '/booking-confirmed/';
            var bookingRef = ref || state.bookingRef;
            window.location.href = confirmUrl + '?ref=' + encodeURIComponent(bookingRef);
        }
    };

    /* ── Helpers ──────────────────────────────── */

    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function show(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = '';
    }

    function hide(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function shortName(name) {
        if (!name) return '--';
        return name.split(',')[0].trim();
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '--';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        }) + ' ' + d.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    }

    function formatPrice(amount, currency) {
        var num = Math.round(parseFloat(amount));
        if (isNaN(num)) return '--';
        var cfg2 = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        var pos = cfg2.currencyPosition || 'after';
        if (pos === 'before') return currency + ' ' + num;
        return num + ' ' + currency;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function clearFieldErrors() {
        var errors = document.querySelectorAll('.tb-checkout__field-error');
        for (var i = 0; i < errors.length; i++) errors[i].textContent = '';
        var inputs = document.querySelectorAll('.tb-checkout__input--error');
        for (var j = 0; j < inputs.length; j++) inputs[j].classList.remove('tb-checkout__input--error');
    }

    function showFieldError(field, message) {
        var el = document.querySelector('.tb-checkout__field-error[data-field="' + field + '"]');
        if (el) el.textContent = message;
        var input = el ? el.previousElementSibling : null;
        if (input && input.tagName === 'DIV') input = input.querySelector('input'); // phone row
        if (input && input.classList) input.classList.add('tb-checkout__input--error');
    }

    function setButtonLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn._origText = btn.innerHTML;
            btn.innerHTML = '<span class="tb-checkout__spinner"></span> ' + (cfg.i18n ? cfg.i18n.processing || 'Processing...' : 'Processing...');
            btn.classList.add('tb-checkout__submit--loading');
            btn.disabled = true;
        } else {
            btn.innerHTML = btn._origText || '';
            btn.classList.remove('tb-checkout__submit--loading');
            btn.disabled = false;
        }
    }

    /* ── Boot ─────────────────────────────────── */

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('tb-checkout')) {
            TB.Checkout.init();
        }
    });

})();
