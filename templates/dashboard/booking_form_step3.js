(function () {
    'use strict';
    window.TB = window.TB || {};
    var stripe = null;
    var elements = null;
    var paymentElement = null;

    TB.Step3 = {
        init: function () {
            this.renderOrderSummary();
            this.restoreCustomerInfo();
            this.initStripe();
            this.bindEvents();
            this.resetPaymentUI();
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
            if (confirmBtn) confirmBtn.addEventListener('click', function () { self.confirmPayment(); });
            var fields = ['tb-customer-name', 'tb-customer-email', 'tb-customer-phone', 'tb-special-requests'];
            for (var j = 0; j < fields.length; j++) {
                var el = document.getElementById(fields[j]);
                if (el) el.addEventListener('input', function () { self.saveCustomerInfo(); });
            }
        },
        restoreCustomerInfo: function () {
            var s = TB.State.getAll();
            var name = document.getElementById('tb-customer-name');
            var email = document.getElementById('tb-customer-email');
            var phone = document.getElementById('tb-customer-phone');
            var requests = document.getElementById('tb-special-requests');
            if (name && s.customerName) name.value = s.customerName;
            if (email && s.customerEmail) email.value = s.customerEmail;
            if (phone && s.customerPhone) phone.value = s.customerPhone;
            if (requests && s.specialRequests) requests.value = s.specialRequests;
        },
        saveCustomerInfo: function () {
            var name = document.getElementById('tb-customer-name');
            var email = document.getElementById('tb-customer-email');
            var phone = document.getElementById('tb-customer-phone');
            var requests = document.getElementById('tb-special-requests');
            if (name) TB.State.set('customerName', name.value.trim());
            if (email) TB.State.set('customerEmail', email.value.trim());
            if (phone) TB.State.set('customerPhone', phone.value.trim());
            if (requests) TB.State.set('specialRequests', requests.value.trim());
        },
        renderOrderSummary: function () {
            var state = TB.State.getAll();
            var route = document.getElementById('tb-order-route');
            var datetime = document.getElementById('tb-order-datetime');
            var vehicle = document.getElementById('tb-order-vehicle');
            var passengers = document.getElementById('tb-order-passengers');
            var total = document.getElementById('tb-order-total');
            if (route) route.textContent = TB.Utils.shortName(state.pickupAddress) + ' \u2192 ' + TB.Utils.shortName(state.dropoffAddress);
            if (datetime) datetime.textContent = TB.Utils.formatDateTime(state.pickupDatetime);
            if (vehicle) vehicle.textContent = state.selectedVehicle ? state.selectedVehicle.category_name : '--';
            if (passengers) passengers.textContent = state.passengers;
            var extrasList = document.getElementById('tb-order-extras-list');
            if (extrasList) {
                var selectedExtras = state.selectedExtras || [];
                var html = '';
                for (var i = 0; i < selectedExtras.length; i++) {
                    var e = selectedExtras[i];
                    var price = e.price * (e.is_per_item ? e.quantity : 1);
                    html += '<div class="tb-summary-item"><span class="tb-summary-label">' + TB.Utils.escapeHtml(e.name);
                    if (e.is_per_item && e.quantity > 1) html += ' x' + e.quantity;
                    html += '</span><span class="tb-summary-value">' + TB.Utils.formatPrice(price) + '</span></div>';
                }
                extrasList.innerHTML = html;
            }
            if (total) {
                var quoteData = state.quoteData;
                if (quoteData && quoteData.total_price) {
                    total.textContent = TB.Utils.formatPrice(quoteData.total_price, quoteData.currency);
                } else {
                    var v = state.selectedVehicle;
                    var basePrice = v ? v.price : 0;
                    var extrasTotal = 0;
                    var se = state.selectedExtras || [];
                    for (var j = 0; j < se.length; j++) extrasTotal += se[j].price * (se[j].is_per_item ? se[j].quantity : 1);
                    var t = basePrice + extrasTotal;
                    if (state.isRoundTrip) t *= 2;
                    total.textContent = TB.Utils.formatPrice(t);
                }
            }
            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn && total) payBtn.textContent = tbConfig.i18n.payNow || ('Pay ' + (total.textContent || ''));
        },
        resetPaymentUI: function () {
            document.getElementById('tb-pay-button').style.display = 'block';
            document.getElementById('tb-stripe-element').style.display = 'none';
            document.getElementById('tb-confirm-payment-btn').style.display = 'none';
            TB.Utils.hideAlert('tb-payment-errors');
            var payBtn = document.getElementById('tb-pay-button');
            if (payBtn) { payBtn.disabled = false; payBtn.classList.remove('tb-btn--loading'); }
        },
        validate: function () {
            TB.Utils.clearFieldErrors();
            var errors = [];
            var name = document.getElementById('tb-customer-name').value.trim();
            var email = document.getElementById('tb-customer-email').value.trim();
            var phone = document.getElementById('tb-customer-phone').value.trim();
            if (!name) errors.push({ field: 'name', msg: tbConfig.i18n.required });
            if (!email || !TB.Utils.validateEmail(email)) errors.push({ field: 'email', msg: tbConfig.i18n.invalidEmail });
            if (!phone || !TB.Utils.validatePhone(phone)) errors.push({ field: 'phone', msg: tbConfig.i18n.invalidPhone });
            for (var i = 0; i < errors.length; i++) TB.Utils.showFieldError(errors[i].field, errors[i].msg);
            return errors.length === 0;
        },
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
            TB.API.createBooking(bookingData)
                .then(function (booking) {
                    TB.State.set('bookingId', booking.id);
                    TB.State.set('bookingRef', booking.booking_ref);
                    TB.State.set('totalPrice', booking.total_price);
                    TB.State.set('currency', booking.currency);
                    TB.State.save();
                    return TB.API.createPayment(booking.id, 'stripe');
                })
                .then(function (paymentData) {
                    TB.State.set('paymentRef', paymentData.payment_ref);
                    TB.State.save();
                    TB.Utils.setButtonLoading(payBtn, false);
                    TB.Step3.mountStripeElements(paymentData.client_secret);
                })
                .catch(function (err) {
                    TB.Utils.setButtonLoading(payBtn, false);
                    TB.Utils.showAlert('tb-payment-errors', err.message || tbConfig.i18n.errorGeneric);
                });
        },
        mountStripeElements: function (clientSecret) {
            if (!stripe) { TB.Utils.showAlert('tb-payment-errors', 'Stripe is not configured.'); return; }
            document.getElementById('tb-pay-button').style.display = 'none';
            var stripeContainer = document.getElementById('tb-stripe-element');
            stripeContainer.style.display = 'block';
            stripeContainer.innerHTML = '';
            elements = stripe.elements({ clientSecret: clientSecret });
            paymentElement = elements.create('payment');
            paymentElement.mount('#tb-stripe-element');
            document.getElementById('tb-confirm-payment-btn').style.display = 'block';
        },
        confirmPayment: function () {
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
        showConfirmation: function () {
            // Save booking results to current leg
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
            // Delegate to wizard (handles multi-city loop or single confirmation)
            TB.Wizard.onLegComplete();
        }
    };
})();
