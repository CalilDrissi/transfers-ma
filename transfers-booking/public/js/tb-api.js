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
                        var msg = (result.data && result.data.message)
                            || (result.data && result.data.error)
                            || (result.data && result.data.detail)
                            || tbConfig.i18n.errorGeneric;
                        reject({ message: msg, data: result.data });
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

        getExtras: function () {
            return this._call('get_extras');
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

        createPayment: function (bookingId, gatewayType) {
            return this._call('create_payment', {
                booking_type: 'transfer',
                booking_id: bookingId,
                gateway_type: gatewayType || 'stripe'
            });
        },

        confirmPayment: function (paymentRef) {
            return this._call('confirm_payment', {
                payment_ref: paymentRef
            });
        }
    };
})();
