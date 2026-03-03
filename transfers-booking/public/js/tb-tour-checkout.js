/**
 * Tour checkout page — personal details, payment, booking.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n, params, state;

    TB.TourCheckout = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};

            state = {
                basePrice: 0,
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
            if (!params.trip_id || !params.date) {
                window.location.href = cfg.toursPageUrl || '/tours/';
                return;
            }

            state.basePrice = params.price;

            this.populateTourSummary();
            this.populatePricingSummary();
            this.initBackLink();
            this.loadPaymentGateways();
            this.initCoupon();
            this.initTerms();
            this.initSubmit();

            // Load custom fields
            if (TB.CustomFields) {
                TB.CustomFields.init('trip', 'tb-tour-custom-fields-container', 'tb-tour-custom-fields-card');
            }
        },

        /* ── Parse URL params ─────────────────── */

        parseParams: function () {
            var sp = new URLSearchParams(window.location.search);
            return {
                trip_id: sp.get('trip_id') || '',
                trip_name: sp.get('trip_name') || '',
                date: sp.get('date') || '',
                adults: parseInt(sp.get('adults'), 10) || 1,
                children: parseInt(sp.get('children'), 10) || 0,
                passengers: parseInt(sp.get('passengers'), 10) || 1,
                is_private: sp.get('is_private') === '1',
                price: parseFloat(sp.get('price')) || 0,
                currency: sp.get('currency') || cfg.currencySymbol || 'MAD'
            };
        },

        /* ── Tour summary ──────────────────────── */

        populateTourSummary: function () {
            setText('tb-tour-checkout-name', params.trip_name);

            var dateEl = document.getElementById('tb-tour-checkout-date');
            if (dateEl) {
                dateEl.innerHTML = dateEl.innerHTML + ' ' + escapeHtml(formatDate(params.date));
            }

            var paxEl = document.getElementById('tb-tour-checkout-pax');
            if (paxEl) {
                var paxText = params.adults + ' ' + (i18n.adults || 'Adults');
                if (params.children > 0) {
                    paxText += ', ' + params.children + ' ' + (i18n.children || 'Children');
                }
                paxEl.innerHTML = paxEl.innerHTML + ' ' + escapeHtml(paxText);
            }

            if (params.is_private) {
                var privateEl = document.getElementById('tb-tour-checkout-private');
                if (privateEl) privateEl.style.display = 'inline-flex';
            }
        },

        /* ── Pricing summary ──────────────────── */

        populatePricingSummary: function () {
            this.updateTotals();
        },

        updateTotals: function () {
            var currency = params.currency;
            var subtotal = state.basePrice;
            var discount = state.discount;
            state.total = Math.max(0, subtotal - discount);

            // Adults line
            var adultsLabel = params.adults + ' x ' + (i18n.adults || 'Adults');
            setText('tb-tour-summary-adults-label', adultsLabel);
            setText('tb-tour-summary-adults-price', formatPrice(state.basePrice, currency));

            // Children line (price is included in total from tour detail calc)
            var childrenLine = document.getElementById('tb-tour-summary-children-line');
            if (childrenLine) {
                if (params.children > 0) {
                    childrenLine.style.display = 'flex';
                    setText('tb-tour-summary-children-label', params.children + ' x ' + (i18n.children || 'Children'));
                    setText('tb-tour-summary-children-price', i18n.free || 'Included');
                } else {
                    childrenLine.style.display = 'none';
                }
            }

            // Private tour line
            var privateLine = document.getElementById('tb-tour-summary-private-line');
            if (privateLine) {
                privateLine.style.display = params.is_private ? 'flex' : 'none';
            }

            // Discount line
            var discountLine = document.getElementById('tb-tour-summary-discount-line');
            if (discountLine) {
                discountLine.style.display = discount > 0 ? 'flex' : 'none';
            }
            if (discount > 0) {
                setText('tb-tour-summary-discount-label', i18n.discount || 'Discount');
                setText('tb-tour-summary-discount-value', '-' + formatPrice(discount, currency));
            }

            setText('tb-tour-summary-total', formatPrice(state.total, currency));
        },

        /* ── Back link ────────────────────────── */

        initBackLink: function () {
            var backLink = document.getElementById('tb-tour-checkout-back');
            if (backLink) {
                backLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    window.history.back();
                });
            }
        },

        /* ── Payment gateways ─────────────────── */

        loadPaymentGateways: function () {
            var self = this;
            var container = document.getElementById('tb-tour-gateways');
            if (!container) return;

            TB.API._call('get_gateways').then(function (data) {
                var gateways = Array.isArray(data) ? data : (data.results || []);
                container.innerHTML = '';

                gateways.forEach(function (gw) {
                    var div = document.createElement('div');
                    div.className = 'tb-tour-checkout__gateway';
                    div.innerHTML =
                        '<label class="tb-tour-checkout__gateway-label">' +
                            '<input type="radio" name="tour_gateway" value="' + escapeHtml(gw.type || gw.code) + '">' +
                            '<span class="tb-tour-checkout__gateway-name">' + escapeHtml(gw.name || gw.type) + '</span>' +
                            (gw.description ? '<span class="tb-tour-checkout__gateway-desc">' + escapeHtml(gw.description) + '</span>' : '') +
                        '</label>';
                    container.appendChild(div);
                });

                // Listen for gateway selection
                container.querySelectorAll('input[name="tour_gateway"]').forEach(function (radio) {
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
            var stripeContainer = document.getElementById('tb-tour-stripe-container');
            var paypalContainer = document.getElementById('tb-tour-paypal-container');
            var cashContainer = document.getElementById('tb-tour-cash-container');

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
            state.stripeCard.mount('#tb-tour-stripe-element');

            state.stripeCard.on('change', function (event) {
                var errorEl = document.getElementById('tb-tour-stripe-errors');
                if (errorEl) errorEl.textContent = event.error ? event.error.message : '';
            });
        },

        /* ── Coupon ───────────────────────────── */

        initCoupon: function () {
            var self = this;
            var applyBtn = document.getElementById('tb-tour-coupon-apply');
            var removeBtn = document.getElementById('tb-tour-coupon-remove');
            var codeInput = document.getElementById('tb-tour-coupon-code');

            if (applyBtn) {
                applyBtn.addEventListener('click', function () {
                    var code = codeInput ? codeInput.value.trim() : '';
                    if (!code) return;

                    applyBtn.disabled = true;
                    applyBtn.textContent = i18n.processing || 'Processing...';

                    TB.API._call('validate_coupon', {
                        code: code,
                        booking_type: 'trip',
                        amount: state.basePrice
                    }).then(function (data) {
                        applyBtn.disabled = false;
                        applyBtn.textContent = i18n.apply || 'Apply';

                        state.coupon = data;
                        state.discount = data.discount_amount || 0;
                        self.updateTotals();

                        var successEl = document.getElementById('tb-tour-coupon-success');
                        var msgEl = document.getElementById('tb-tour-coupon-message');
                        var errorEl = document.getElementById('tb-tour-coupon-error');
                        if (successEl) successEl.style.display = 'flex';
                        if (msgEl) msgEl.textContent = data.message || (i18n.discount || 'Discount') + ': -' + formatPrice(state.discount, params.currency);
                        if (errorEl) errorEl.style.display = 'none';
                        if (codeInput) codeInput.disabled = true;
                    }).catch(function (err) {
                        applyBtn.disabled = false;
                        applyBtn.textContent = i18n.apply || 'Apply';

                        var errorEl = document.getElementById('tb-tour-coupon-error');
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
                    var successEl = document.getElementById('tb-tour-coupon-success');
                    if (successEl) successEl.style.display = 'none';
                });
            }
        },

        /* ── Terms ────────────────────────────── */

        initTerms: function () {
            var self = this;
            var termsCheckbox = document.getElementById('tb-tour-terms');
            if (termsCheckbox) {
                termsCheckbox.addEventListener('change', function () {
                    self.updateSubmitState();
                });
            }
        },

        updateSubmitState: function () {
            var termsChecked = document.getElementById('tb-tour-terms');
            var submitBtn = document.getElementById('tb-tour-checkout-submit');
            if (submitBtn) {
                submitBtn.disabled = !(state.selectedGateway && termsChecked && termsChecked.checked);
            }
        },

        /* ── Form submission ──────────────────── */

        initSubmit: function () {
            var self = this;
            var submitBtn = document.getElementById('tb-tour-checkout-submit');
            if (!submitBtn) return;

            submitBtn.addEventListener('click', function () {
                if (!self.validateForm()) return;
                self.submitBooking();
            });
        },

        validateForm: function () {
            var valid = true;
            clearFieldErrors();

            var name = document.getElementById('tb-tour-name');
            var email = document.getElementById('tb-tour-email');
            var phone = document.getElementById('tb-tour-phone');
            var terms = document.getElementById('tb-tour-terms');

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
            if (!terms || !terms.checked) {
                showFieldError('terms', i18n.termsRequired || 'You must agree to the terms');
                valid = false;
            }
            if (!state.selectedGateway) {
                showAlert('tb-tour-checkout-alert', i18n.selectPayment || 'Please select a payment method');
                valid = false;
            }
            if (TB.CustomFields && !TB.CustomFields.validate()) {
                valid = false;
            }

            return valid;
        },

        submitBooking: function () {
            var self = this;
            var submitBtn = document.getElementById('tb-tour-checkout-submit');
            setButtonLoading(submitBtn, true);
            hideAlert('tb-tour-checkout-alert');

            var bookingData = {
                trip_id: params.trip_id,
                date: params.date,
                adults: params.adults,
                children: params.children,
                is_private: params.is_private,
                customer_name: document.getElementById('tb-tour-name').value.trim(),
                customer_email: document.getElementById('tb-tour-email').value.trim(),
                customer_phone: document.getElementById('tb-tour-phone').value.trim(),
                whatsapp_number: (document.getElementById('tb-tour-whatsapp') || {}).value || '',
                special_requests: (document.getElementById('tb-tour-requests') || {}).value || '',
                custom_field_values: TB.CustomFields ? TB.CustomFields.getValues() : {},
                coupon_code: state.coupon ? state.coupon.code : null,
                payment_gateway: state.selectedGateway
            };

            TB.API._call('create_trip_booking', bookingData).then(function (data) {
                state.bookingRef = data.booking_ref || data.reference;
                state.bookingId = data.id;

                if (state.selectedGateway === 'cash') {
                    self.goToConfirmation(data);
                } else if (state.selectedGateway === 'stripe') {
                    self.processStripePayment(data);
                } else if (state.selectedGateway === 'paypal') {
                    self.processPayPalPayment(data);
                } else {
                    self.goToConfirmation(data);
                }
            }).catch(function (err) {
                setButtonLoading(submitBtn, false);
                showAlert('tb-tour-checkout-alert', err.message || (i18n.errorGeneric || 'Something went wrong. Please try again.'));
            });
        },

        processStripePayment: function (bookingData) {
            var self = this;
            var submitBtn = document.getElementById('tb-tour-checkout-submit');

            TB.API._call('create_payment', {
                booking_type: 'trip',
                booking_id: bookingData.id,
                gateway_type: 'stripe'
            }).then(function (paymentData) {
                var clientSecret = paymentData.client_secret;
                if (!clientSecret || !state.stripe || !state.stripeCard) {
                    setButtonLoading(submitBtn, false);
                    showAlert('tb-tour-checkout-alert', i18n.paymentFailed || 'Payment setup failed.');
                    return;
                }

                state.stripe.confirmCardPayment(clientSecret, {
                    payment_method: { card: state.stripeCard }
                }).then(function (result) {
                    if (result.error) {
                        setButtonLoading(submitBtn, false);
                        showAlert('tb-tour-checkout-alert', result.error.message);
                    } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                        TB.API._call('confirm_payment', {
                            payment_ref: paymentData.payment_ref || paymentData.reference
                        }).then(function () {
                            self.goToConfirmation(bookingData);
                        }).catch(function () {
                            self.goToConfirmation(bookingData);
                        });
                    }
                });
            }).catch(function (err) {
                setButtonLoading(submitBtn, false);
                showAlert('tb-tour-checkout-alert', err.message || (i18n.paymentFailed || 'Payment failed.'));
            });
        },

        processPayPalPayment: function (bookingData) {
            var submitBtn = document.getElementById('tb-tour-checkout-submit');

            TB.API._call('create_payment', {
                booking_type: 'trip',
                booking_id: bookingData.id,
                gateway_type: 'paypal'
            }).then(function (paymentData) {
                if (paymentData.approval_url) {
                    window.location.href = paymentData.approval_url;
                } else {
                    setButtonLoading(submitBtn, false);
                    showAlert('tb-tour-checkout-alert', i18n.paymentFailed || 'PayPal payment setup failed.');
                }
            }).catch(function (err) {
                setButtonLoading(submitBtn, false);
                showAlert('tb-tour-checkout-alert', err.message || (i18n.paymentFailed || 'Payment failed.'));
            });
        },

        goToConfirmation: function (bookingData) {
            var confirmUrl = cfg.tourConfirmationPageUrl || '/tour-confirmed/';
            var sp = new URLSearchParams();
            sp.set('ref', state.bookingRef || '');
            sp.set('trip_name', params.trip_name);
            sp.set('date', params.date);
            sp.set('adults', params.adults);
            sp.set('children', params.children);
            sp.set('is_private', params.is_private ? '1' : '0');
            sp.set('total', state.total);
            sp.set('currency', params.currency);
            sp.set('gateway', state.selectedGateway || '');
            window.location.href = confirmUrl + '?' + sp.toString();
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
        var el = document.querySelector('.tb-tour-checkout__field-error[data-field="' + field + '"]');
        if (el) el.textContent = message;
    }

    function clearFieldErrors() {
        document.querySelectorAll('.tb-tour-checkout__field-error').forEach(function (el) {
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
            btn.innerHTML = '<span class="tb-tour-checkout__spinner-inline"></span> ' + escapeHtml(i18n.processing || 'Processing...');
            btn.disabled = true;
        } else {
            btn.innerHTML = btn._origText || '';
            btn.disabled = false;
        }
    }

    /* ── Boot ──────────────────────────────────── */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { TB.TourCheckout.init(); });
    } else {
        TB.TourCheckout.init();
    }
})();
