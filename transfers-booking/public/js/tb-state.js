/**
 * State management with localStorage persistence.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var STORAGE_KEY = 'tb_booking_state';

    var defaults = {
        step: 1,
        // Step 1
        transferType: '',
        pickupAddress: '',
        pickupLat: null,
        pickupLng: null,
        dropoffAddress: '',
        dropoffLat: null,
        dropoffLng: null,
        pickupDatetime: '',
        passengers: 1,
        isRoundTrip: false,
        returnDatetime: '',
        flightNumber: '',
        // Step 2
        pricingData: null,
        vehicleOptions: [],
        selectedVehicle: null,
        extras: [],
        selectedExtras: [],
        quoteData: null,
        // Step 3
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        specialRequests: '',
        // Result
        bookingId: null,
        bookingRef: '',
        paymentRef: '',
        totalPrice: 0,
        currency: 'MAD'
    };

    var _data = {};

    // Deep clone defaults
    function cloneDefaults() {
        return JSON.parse(JSON.stringify(defaults));
    }

    TB.State = {

        get: function (key) {
            return _data.hasOwnProperty(key) ? _data[key] : null;
        },

        set: function (key, value) {
            _data[key] = value;
        },

        getAll: function () {
            return JSON.parse(JSON.stringify(_data));
        },

        save: function () {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
            } catch (e) {
                // localStorage may be full or unavailable
            }
        },

        load: function () {
            try {
                var saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    var parsed = JSON.parse(saved);
                    _data = Object.assign(cloneDefaults(), parsed);
                } else {
                    _data = cloneDefaults();
                }
            } catch (e) {
                _data = cloneDefaults();
            }
        },

        reset: function () {
            _data = cloneDefaults();
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                // ignore
            }
        }
    };

    // Initialize
    TB.State.load();
})();
