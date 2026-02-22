/**
 * API client. All calls go through the WordPress AJAX proxy.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    TB.API = {

        _call: function (endpoint, params) {
            return new Promise(function (resolve, reject) {
                var formData = new FormData();
                formData.append('action', 'tb_api_proxy');
                formData.append('nonce', tbConfig.nonce);
                formData.append('endpoint', endpoint);
                formData.append('params', JSON.stringify(params || {}));

                fetch(tbConfig.ajaxUrl, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                })
                .then(function (response) {
                    return response.json();
                })
                .then(function (result) {
                    if (result.success) {
                        resolve(result.data);
                    } else {
                        var d = result.data || {};
                        var msg;
                        if (typeof d === 'string') {
                            msg = d;
                        } else if (typeof d.message === 'string') {
                            msg = d.message;
                        } else if (typeof d.error === 'string') {
                            msg = d.error;
                        } else if (typeof d.detail === 'string') {
                            msg = d.detail;
                        } else {
                            // DRF field errors: {"field": ["msg", ...], ...} — grab first
                            msg = null;
                            for (var key in d) {
                                if (d.hasOwnProperty(key)) {
                                    var val = d[key];
                                    if (typeof val === 'string') { msg = val; break; }
                                    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') { msg = val[0]; break; }
                                }
                            }
                            msg = msg || tbConfig.i18n.errorGeneric;
                        }
                        reject({ message: msg, data: d });
                    }
                })
                .catch(function (err) {
                    reject({ message: err.message || tbConfig.i18n.errorGeneric });
                });
            });
        },

        getGoogleMapsConfig: function () {
            return this._call('google_maps_config');
        },

        getPricing: function (originLat, originLng, destLat, destLng, passengers) {
            return this._call('get_pricing', {
                origin_lat: originLat,
                origin_lng: originLng,
                destination_lat: destLat,
                destination_lng: destLng,
                passengers: passengers
            });
        },

        getExtras: function (categoryId) {
            var p = {};
            if (categoryId) p.vehicle_category_id = categoryId;
            return this._call('get_extras', p);
        },

        getCategories: function () {
            return this._call('get_categories');
        },

        getQuote: function (quoteData) {
            return this._call('get_quote', quoteData);
        },

        createBooking: function (bookingData) {
            return this._call('create_booking', bookingData);
        },

        createPayment: function (bookingId, gatewayType, paymentAmount) {
            var params = {
                booking_type: 'transfer',
                booking_id: bookingId,
                gateway_type: gatewayType || 'stripe'
            };
            if (paymentAmount !== undefined && paymentAmount !== null) {
                params.payment_amount = paymentAmount;
            }
            return this._call('create_payment', params);
        },

        confirmPayment: function (paymentRef) {
            return this._call('confirm_payment', {
                payment_ref: paymentRef
            });
        },

        getGateways: function () {
            return this._call('get_gateways');
        }
    };
})();
