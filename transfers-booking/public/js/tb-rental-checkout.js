/**
 * Rental checkout page — vehicle details, insurance, extras, payment, booking.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n, params, state;

    TB.RentalCheckout = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};

            state = {
                basePrice: 0,
                dailyPrice: 0,
                days: 1,
                insurancePrice: 0,
                selectedInsurance: null,
                extras: [],
                extrasTotal: 0,
                coupon: null,
                discount: 0,
                total: 0,
                selectedGateway: null,
                stripe: null,
                stripeCard: null,
                bookingId: null,
                bookingRef: null
            };

            params = this.parseParams();
            if (!params.vehicle_id || !params.pickup_date || !params.return_date) {
                window.location.href = '/';
                return;
            }

            state.dailyPrice = params.daily_price;
            state.days = params.days;
            state.basePrice = params.total_price;

            this.populateVehicleSummary();
            this.populatePricingSummary();
            this.initBackLink();
            this.loadInsurance();
            this.loadExtras();
            this.loadPaymentGateways();
            this.initCoupon();
            this.initTerms();
            this.initSubmit();
        },

        /* ── Parse URL params ─────────────────── */

        parseParams: function () {
            var sp = new URLSearchParams(window.location.search);
            return {
                vehicle_id: sp.get('vehicle_id') || '',
                city: sp.get('city') || '',
                city_name: sp.get('city_name') || '',
                pickup_date: sp.get('pickup_date') || '',
                return_date: sp.get('return_date') || '',
                daily_price: parseFloat(sp.get('daily_price')) || 0,
                total_price: parseFloat(sp.get('total_price')) || 0,
                currency: sp.get('currency') || cfg.currencySymbol || 'MAD',
                vehicle_name: sp.get('vehicle_name') || '',
                company_name: sp.get('company_name') || '',
                vehicle_image: sp.get('vehicle_image') || '',
                days: parseInt(sp.get('days'), 10) || 1
            };
        },

        /* ── Vehicle summary ──────────────────── */

        populateVehicleSummary: function () {
            var img = document.getElementById('tb-rental-checkout-vehicle-img');
            if (img && params.vehicle_image) {
                img.src = params.vehicle_image;
                img.alt = params.vehicle_name;
            }
            setText('tb-rental-checkout-vehicle-name', params.vehicle_name);
            setText('tb-rental-checkout-vehicle-company', params.company_name);
        },

        /* ── Pricing summary ──────────────────── */

        populatePricingSummary: function () {
            setText('tb-rental-summary-pickup', formatDate(params.pickup_date));
            setText('tb-rental-summary-return', formatDate(params.return_date));
            setText('tb-rental-summary-days', state.days + ' ' + (state.days === 1 ? (i18n.day || 'day') : (i18n.days || 'days')));

            this.updateTotals();
        },

        updateTotals: function () {
            var currency = params.currency;
            var subtotal = state.basePrice + state.insurancePrice + state.extrasTotal;
            var discount = state.discount;
            state.total = Math.max(0, subtotal - discount);

            setText('tb-rental-summary-base', formatPrice(state.basePrice, currency));
            setText('tb-rental-summary-total', formatPrice(state.total, currency));

            // Discount line
            var discountLine = document.getElementById('tb-rental-summary-discount-line');
            if (discountLine) {
                discountLine.style.display = discount > 0 ? 'flex' : 'none';
            }
            if (discount > 0) {
                setText('tb-rental-summary-discount-label', i18n.discount || 'Discount');
                setText('tb-rental-summary-discount-value', '-' + formatPrice(discount, currency));
            }

            // Remove old dynamic lines and re-add
            this.renderDynamicLines(currency);
        },

        renderDynamicLines: function (currency) {
            var container = document.getElementById('tb-rental-summary-lines');
            if (!container) return;

            // Remove previously injected lines
            container.querySelectorAll('.tb-rental-summary__line--dynamic').forEach(function (el) {
                el.remove();
            });

            var discountLine = document.getElementById('tb-rental-summary-discount-line');

            // Insurance line
            if (state.insurancePrice > 0) {
                var insLine = document.createElement('div');
                insLine.className = 'tb-rental-summary__line tb-rental-summary__line--dynamic';
                insLine.innerHTML = '<span>' + escapeHtml(i18n.insurance || 'Insurance') + '</span><span>' + escapeHtml(formatPrice(state.insurancePrice, currency)) + '</span>';
                container.insertBefore(insLine, discountLine);
            }

            // Extras lines
            state.extras.forEach(function (extra) {
                if (extra.selected) {
                    var line = document.createElement('div');
                    line.className = 'tb-rental-summary__line tb-rental-summary__line--dynamic';
                    line.innerHTML = '<span>' + escapeHtml(extra.name) + '</span><span>' + escapeHtml(formatPrice(extra.price, currency)) + '</span>';
                    container.insertBefore(line, discountLine);
                }
            });
        },

        /* ── Back link ────────────────────────── */

        initBackLink: function () {
            var backLink = document.getElementById('tb-rental-checkout-back');
            if (backLink) {
                backLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    window.history.back();
                });
            }
        },

        /* ── Insurance ────────────────────────── */

        loadInsurance: function () {
            var self = this;
            var card = document.getElementById('tb-rental-insurance-card');
            var container = document.getElementById('tb-rental-insurance-options');
            if (!card || !container) return;

            TB.API._call('rental_insurance', { city: params.city }).then(function (data) {
                var options = Array.isArray(data) ? data : (data.results || []);
                if (options.length === 0) return;

                card.style.display = 'block';
                container.innerHTML = '';

                options.forEach(function (opt) {
                    var div = document.createElement('div');
                    div.className = 'tb-rental-checkout__insurance-option';
                    div.innerHTML =
                        '<label>' +
                            '<input type="radio" name="rental_insurance" value="' + escapeHtml(String(opt.id)) + '" data-price="' + (opt.daily_price || opt.price || 0) + '">' +
                            '<div class="tb-rental-checkout__insurance-info">' +
                                '<strong>' + escapeHtml(opt.name) + '</strong>' +
                                '<p>' + escapeHtml(opt.description || '') + '</p>' +
                            '</div>' +
                            '<span class="tb-rental-checkout__insurance-price">' + formatPrice((opt.daily_price || opt.price || 0) * state.days, params.currency) + '</span>' +
                        '</label>';
                    container.appendChild(div);
                });

                // No insurance option
                var noneDiv = document.createElement('div');
                noneDiv.className = 'tb-rental-checkout__insurance-option';
                noneDiv.innerHTML =
                    '<label>' +
                        '<input type="radio" name="rental_insurance" value="" data-price="0" checked>' +
                        '<div class="tb-rental-checkout__insurance-info">' +
                            '<strong>' + escapeHtml(i18n.noInsurance || 'No additional insurance') + '</strong>' +
                        '</div>' +
                        '<span class="tb-rental-checkout__insurance-price">' + escapeHtml(i18n.free || 'Free') + '</span>' +
                    '</label>';
                container.appendChild(noneDiv);

                // Listen for changes
                container.querySelectorAll('input[name="rental_insurance"]').forEach(function (radio) {
                    radio.addEventListener('change', function () {
                        var price = parseFloat(this.getAttribute('data-price')) || 0;
                        state.insurancePrice = price * state.days;
                        state.selectedInsurance = this.value || null;
                        self.updateTotals();
                    });
                });
            }).catch(function () {
                // Insurance not available, silently skip
            });
        },

        /* ── Extras ───────────────────────────── */

        loadExtras: function () {
            var self = this;
            var card = document.getElementById('tb-rental-extras-card');
            var container = document.getElementById('tb-rental-extras-options');
            if (!card || !container) return;

            TB.API._call('rental_extras', { city: params.city }).then(function (data) {
                var extras = Array.isArray(data) ? data : (data.results || []);
                if (extras.length === 0) return;

                card.style.display = 'block';
                container.innerHTML = '';

                extras.forEach(function (extra) {
                    var price = extra.daily_price || extra.price || 0;
                    var totalPrice = price * state.days;
                    var div = document.createElement('div');
                    div.className = 'tb-rental-checkout__extra-item';
                    div.innerHTML =
                        '<label>' +
                            '<input type="checkbox" data-extra-id="' + extra.id + '" data-price="' + price + '">' +
                            '<div class="tb-rental-checkout__extra-info">' +
                                '<strong>' + escapeHtml(extra.name) + '</strong>' +
                                (extra.description ? '<p>' + escapeHtml(extra.description) + '</p>' : '') +
                            '</div>' +
                            '<span class="tb-rental-checkout__extra-price">' + formatPrice(totalPrice, params.currency) + '</span>' +
                        '</label>';
                    container.appendChild(div);

                    state.extras.push({
                        id: extra.id,
                        name: extra.name,
                        price: totalPrice,
                        selected: false
                    });
                });

                // Listen for changes
                container.querySelectorAll('input[type="checkbox"]').forEach(function (cb, idx) {
                    cb.addEventListener('change', function () {
                        state.extras[idx].selected = this.checked;
                        state.extrasTotal = state.extras.reduce(function (sum, e) {
                            return sum + (e.selected ? e.price : 0);
                        }, 0);
                        self.updateTotals();
                    });
                });
            }).catch(function () {
                // Extras not available, silently skip
            });
        },

        /* ── Payment gateways ─────────────────── */

        loadPaymentGateways: function () {
            var self = this;
            var container = document.getElementById('tb-rental-gateways');
            if (!container) return;

            TB.API._call('get_gateways').then(function (data) {
                var gateways = Array.isArray(data) ? data : (data.results || []);
                container.innerHTML = '';

                gateways.forEach(function (gw) {
                    var div = document.createElement('div');
                    div.className = 'tb-rental-checkout__gateway';
                    div.innerHTML =
                        '<label class="tb-rental-checkout__gateway-label">' +
                            '<input type="radio" name="rental_gateway" value="' + escapeHtml(gw.type || gw.code) + '">' +
                            '<span class="tb-rental-checkout__gateway-name">' + escapeHtml(gw.name || gw.type) + '</span>' +
                            (gw.description ? '<span class="tb-rental-checkout__gateway-desc">' + escapeHtml(gw.description) + '</span>' : '') +
                        '</label>';
                    container.appendChild(div);
                });

                // Listen for gateway selection
                container.querySelectorAll('input[name="rental_gateway"]').forEach(function (radio) {
                    radio.addEventListener('change', function () {
                        state.selectedGateway = this.value;
                        self.showGatewayUI(this.value);
                        self.updateSubmitState();
                    });
                });
            }).catch(function () {
                container.innerHTML = '<p>' + escapeHtml(i18n.errorGeneric || 'Error loading payment methods.') + '</p>';
            });
        },

        showGatewayUI: function (gateway) {
            var stripeContainer = document.getElementById('tb-rental-stripe-container');
            var paypalContainer = document.getElementById('tb-rental-paypal-container');
            var cashContainer = document.getElementById('tb-rental-cash-container');

            if (stripeContainer) stripeContainer.style.display = 'none';
            if (paypalContainer) paypalContainer.style.display = 'none';
            if (cashContainer) cashContainer.style.display = 'none';

            if (gateway === 'stripe' && stripeContainer) {
                stripeContainer.style.display = 'block';
                this.initStripe();
            } else if (gateway === 'paypal' && paypalContainer) {
                paypalContainer.style.display = 'block';
            } else if (gateway === 'cash' && cashContainer) {
                cashContainer.style.display = 'block';
            }
        },

        initStripe: function () {
            if (state.stripe) return;
            if (typeof Stripe === 'undefined' || !cfg.stripePublishableKey) return;

            state.stripe = Stripe(cfg.stripePublishableKey);
            var elements = state.stripe.elements();
            state.stripeCard = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        color: '#1E293B'
                    }
                }
            });
            state.stripeCard.mount('#tb-rental-stripe-element');

            state.stripeCard.on('change', function (event) {
                var errorEl = document.getElementById('tb-rental-stripe-errors');
                if (errorEl) errorEl.textContent = event.error ? event.error.message : '';
            });
        },

        /* ── Coupon ───────────────────────────── */

        initCoupon: function () {
            var self = this;
            var applyBtn = document.getElementById('tb-rental-coupon-apply');
            var removeBtn = document.getElementById('tb-rental-coupon-remove');
            var codeInput = document.getElementById('tb-rental-coupon-code');

            if (applyBtn) {
                applyBtn.addEventListener('click', function () {
                    var code = codeInput ? codeInput.value.trim() : '';
                    if (!code) return;

                    applyBtn.disabled = true;
                    applyBtn.textContent = i18n.processing || 'Processing...';

                    TB.API._call('validate_coupon', {
                        code: code,
                        booking_type: 'rental',
                        amount: state.basePrice + state.insurancePrice + state.extrasTotal
                    }).then(function (data) {
                        applyBtn.disabled = false;
                        applyBtn.textContent = i18n.apply || 'Apply';

                        state.coupon = data;
                        state.discount = data.discount_amount || 0;
                        self.updateTotals();

                        var successEl = document.getElementById('tb-rental-coupon-success');
                        var msgEl = document.getElementById('tb-rental-coupon-message');
                        var errorEl = document.getElementById('tb-rental-coupon-error');
                        if (successEl) successEl.style.display = 'flex';
                        if (msgEl) msgEl.textContent = data.message || (i18n.discount || 'Discount') + ': -' + formatPrice(state.discount, params.currency);
                        if (errorEl) errorEl.style.display = 'none';
                        if (codeInput) codeInput.disabled = true;
                    }).catch(function (err) {
                        applyBtn.disabled = false;
                        applyBtn.textContent = i18n.apply || 'Apply';

                        var errorEl = document.getElementById('tb-rental-coupon-error');
                        if (errorEl) {
                            errorEl.textContent = err.message || (i18n.invalidCoupon || 'Invalid coupon code');
                            errorEl.style.display = 'block';
                        }
                    });
                });
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    state.coupon = null;
                    state.discount = 0;
                    self.updateTotals();

                    if (codeInput) {
                        codeInput.value = '';
                        codeInput.disabled = false;
                    }
                    var successEl = document.getElementById('tb-rental-coupon-success');
                    if (successEl) successEl.style.display = 'none';
                });
            }
        },

        /* ── Terms ────────────────────────────── */

        initTerms: function () {
            var self = this;
            var termsCheckbox = document.getElementById('tb-rental-terms');
            if (termsCheckbox) {
                termsCheckbox.addEventListener('change', function () {
                    self.updateSubmitState();
                });
            }
        },

        updateSubmitState: function () {
            var termsChecked = document.getElementById('tb-rental-terms');
            var submitBtn = document.getElementById('tb-rental-checkout-submit');
            if (submitBtn) {
                submitBtn.disabled = !(state.selectedGateway && termsChecked && termsChecked.checked);
            }
        },

        /* ── Form submission ──────────────────── */

        initSubmit: function () {
            var self = this;
            var submitBtn = document.getElementById('tb-rental-checkout-submit');
            if (!submitBtn) return;

            submitBtn.addEventListener('click', function () {
                if (!self.validateForm()) return;
                self.submitBooking();
            });
        },

        validateForm: function () {
            var valid = true;
            clearFieldErrors();

            var name = document.getElementById('tb-rental-name');
            var email = document.getElementById('tb-rental-email');
            var phone = document.getElementById('tb-rental-phone');
            var license = document.getElementById('tb-rental-license');
            var licenseExpiry = document.getElementById('tb-rental-license-expiry');
            var dob = document.getElementById('tb-rental-dob');
            var terms = document.getElementById('tb-rental-terms');

            if (!name || !name.value.trim()) {
                showFieldError('name', i18n.required || 'This field is required');
                valid = false;
            }
            if (!email || !email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
                showFieldError('email', i18n.invalidEmail || 'Please enter a valid email');
                valid = false;
            }
            if (!phone || !phone.value.trim() || !/^[\+]?[\d\s\-()]{8,}$/.test(phone.value)) {
                showFieldError('phone', i18n.invalidPhone || 'Please enter a valid phone number');
                valid = false;
            }
            if (!license || !license.value.trim()) {
                showFieldError('license_number', i18n.required || 'This field is required');
                valid = false;
            }
            if (!licenseExpiry || !licenseExpiry.value) {
                showFieldError('license_expiry', i18n.required || 'This field is required');
                valid = false;
            }
            if (!dob || !dob.value) {
                showFieldError('date_of_birth', i18n.required || 'This field is required');
                valid = false;
            }
            if (!terms || !terms.checked) {
                showFieldError('terms', i18n.required || 'You must agree to the terms');
                valid = false;
            }
            if (!state.selectedGateway) {
                showAlert('tb-rental-checkout-alert', i18n.selectPayment || 'Please select a payment method');
                valid = false;
            }

            return valid;
        },

        submitBooking: function () {
            var self = this;
            var submitBtn = document.getElementById('tb-rental-checkout-submit');
            setButtonLoading(submitBtn, true);
            hideAlert('tb-rental-checkout-alert');

            var selectedExtras = state.extras.filter(function (e) { return e.selected; }).map(function (e) { return e.id; });

            var bookingData = {
                vehicle_id: params.vehicle_id,
                city: params.city,
                pickup_date: params.pickup_date,
                return_date: params.return_date,
                customer_name: document.getElementById('tb-rental-name').value.trim(),
                customer_email: document.getElementById('tb-rental-email').value.trim(),
                customer_phone: document.getElementById('tb-rental-phone').value.trim(),
                flight_number: (document.getElementById('tb-rental-flight') || {}).value || '',
                license_number: document.getElementById('tb-rental-license').value.trim(),
                license_expiry: document.getElementById('tb-rental-license-expiry').value,
                date_of_birth: document.getElementById('tb-rental-dob').value,
                insurance_id: state.selectedInsurance || null,
                extras: selectedExtras,
                coupon_code: state.coupon ? state.coupon.code : null,
                payment_gateway: state.selectedGateway
            };

            TB.API._call('rental_create', bookingData).then(function (data) {
                state.bookingRef = data.booking_ref || data.reference;
                state.bookingId = data.id;

                if (state.selectedGateway === 'cash') {
                    self.goToConfirmation();
                } else if (state.selectedGateway === 'stripe') {
                    self.processStripePayment(data);
                } else if (state.selectedGateway === 'paypal') {
                    self.processPayPalPayment(data);
                } else {
                    self.goToConfirmation();
                }
            }).catch(function (err) {
                setButtonLoading(submitBtn, false);
                showAlert('tb-rental-checkout-alert', err.message || (i18n.errorGeneric || 'Something went wrong. Please try again.'));
            });
        },

        processStripePayment: function (bookingData) {
            var self = this;
            var submitBtn = document.getElementById('tb-rental-checkout-submit');

            // Create payment via API
            TB.API._call('create_payment', {
                booking_type: 'rental',
                booking_id: bookingData.id,
                gateway_type: 'stripe'
            }).then(function (paymentData) {
                var clientSecret = paymentData.client_secret;
                if (!clientSecret || !state.stripe || !state.stripeCard) {
                    setButtonLoading(submitBtn, false);
                    showAlert('tb-rental-checkout-alert', i18n.paymentFailed || 'Payment setup failed.');
                    return;
                }

                state.stripe.confirmCardPayment(clientSecret, {
                    payment_method: { card: state.stripeCard }
                }).then(function (result) {
                    if (result.error) {
                        setButtonLoading(submitBtn, false);
                        showAlert('tb-rental-checkout-alert', result.error.message);
                    } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                        // Confirm payment on backend
                        TB.API._call('confirm_payment', {
                            payment_ref: paymentData.payment_ref || paymentData.reference
                        }).then(function () {
                            self.goToConfirmation();
                        }).catch(function () {
                            // Payment succeeded even if confirm call fails
                            self.goToConfirmation();
                        });
                    }
                });
            }).catch(function (err) {
                setButtonLoading(submitBtn, false);
                showAlert('tb-rental-checkout-alert', err.message || (i18n.paymentFailed || 'Payment failed.'));
            });
        },

        processPayPalPayment: function (bookingData) {
            var self = this;
            var submitBtn = document.getElementById('tb-rental-checkout-submit');

            TB.API._call('create_payment', {
                booking_type: 'rental',
                booking_id: bookingData.id,
                gateway_type: 'paypal'
            }).then(function (paymentData) {
                if (paymentData.approval_url) {
                    window.location.href = paymentData.approval_url;
                } else {
                    setButtonLoading(submitBtn, false);
                    showAlert('tb-rental-checkout-alert', i18n.paymentFailed || 'PayPal payment setup failed.');
                }
            }).catch(function (err) {
                setButtonLoading(submitBtn, false);
                showAlert('tb-rental-checkout-alert', err.message || (i18n.paymentFailed || 'Payment failed.'));
            });
        },

        goToConfirmation: function () {
            var confirmUrl = cfg.rentalConfirmationPageUrl || '/rental-confirmed/';
            window.location.href = confirmUrl + '?ref=' + encodeURIComponent(state.bookingRef);
        }
    };

    /* ── Helpers ───────────────────────────────── */

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text || '--';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '--';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function formatPrice(amount, currency) {
        currency = currency || (cfg && cfg.currencySymbol) || 'MAD';
        var position = (cfg && cfg.currencyPosition) || 'after';
        var num = Math.round(parseFloat(amount));
        if (isNaN(num)) return '--';
        if (position === 'before') return currency + ' ' + num;
        return num + ' ' + currency;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function showFieldError(field, message) {
        var el = document.querySelector('.tb-rental-checkout__field-error[data-field="' + field + '"]');
        if (el) el.textContent = message;
    }

    function clearFieldErrors() {
        document.querySelectorAll('.tb-rental-checkout__field-error').forEach(function (el) {
            el.textContent = '';
        });
    }

    function showAlert(id, message) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
        }
    }

    function hideAlert(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function setButtonLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn._origText = btn.innerHTML;
            btn.innerHTML = '<span class="tb-rental-checkout__spinner-inline"></span> ' + escapeHtml(i18n.processing || 'Processing...');
            btn.disabled = true;
        } else {
            btn.innerHTML = btn._origText || '';
            btn.disabled = false;
        }
    }

    /* ── Boot ──────────────────────────────────── */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { TB.RentalCheckout.init(); });
    } else {
        TB.RentalCheckout.init();
    }
})();
