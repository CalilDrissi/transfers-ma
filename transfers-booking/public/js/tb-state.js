/**
 * State management with localStorage persistence.
 * Supports multi-city legs, luggage tracking, and leg/flat sync.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var STORAGE_KEY = 'tb_booking_state';

    var defaultLeg = {
        pickupAddress: '', pickupLat: null, pickupLng: null,
        dropoffAddress: '', dropoffLat: null, dropoffLng: null,
        pickupDatetime: '', transferType: '', flightNumber: '',
        pricingData: null, vehicleOptions: [], selectedVehicle: null,
        selectedExtras: [], quoteData: null, bookingId: null,
        bookingRef: '', paymentRef: '', totalPrice: 0
    };

    var defaults = {
        step: 1,
        mode: 'one-way',
        currentLegIndex: 0,
        legs: [JSON.parse(JSON.stringify(defaultLeg))],
        /* flat fields kept for backward compat with Steps 2/3 */
        transferType: '',
        pickupAddress: '',
        pickupLat: null,
        pickupLng: null,
        dropoffAddress: '',
        dropoffLat: null,
        dropoffLng: null,
        pickupDatetime: '',
        passengers: 1,
        luggage: 1,
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
            } catch (e) {}
        },

        load: function () {
            try {
                var saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    _data = Object.assign(cloneDefaults(), JSON.parse(saved));
                } else {
                    _data = cloneDefaults();
                }
            } catch (e) {
                _data = cloneDefaults();
            }
            // Ensure legs array exists (for older saved states)
            if (!_data.legs || !_data.legs.length) {
                _data.legs = [JSON.parse(JSON.stringify(defaultLeg))];
            }
        },

        reset: function () {
            _data = cloneDefaults();
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {}
        },

        syncLegToFlat: function (idx) {
            var legs = _data.legs || [];
            var leg = legs[idx];
            if (!leg) return;
            _data.transferType = leg.transferType || '';
            _data.pickupAddress = leg.pickupAddress || '';
            _data.pickupLat = leg.pickupLat;
            _data.pickupLng = leg.pickupLng;
            _data.dropoffAddress = leg.dropoffAddress || '';
            _data.dropoffLat = leg.dropoffLat;
            _data.dropoffLng = leg.dropoffLng;
            _data.pickupDatetime = leg.pickupDatetime || '';
            _data.flightNumber = leg.flightNumber || '';
            _data.pricingData = leg.pricingData || null;
            _data.vehicleOptions = leg.vehicleOptions || [];
            _data.selectedVehicle = leg.selectedVehicle || null;
            _data.selectedExtras = leg.selectedExtras || [];
            _data.quoteData = leg.quoteData || null;
            _data.bookingId = leg.bookingId || null;
            _data.bookingRef = leg.bookingRef || '';
            _data.paymentRef = leg.paymentRef || '';
            _data.totalPrice = leg.totalPrice || 0;
        },

        saveFlatToLeg: function (idx) {
            var legs = _data.legs || [];
            if (!legs[idx]) return;
            legs[idx].transferType = _data.transferType;
            legs[idx].pickupAddress = _data.pickupAddress;
            legs[idx].pickupLat = _data.pickupLat;
            legs[idx].pickupLng = _data.pickupLng;
            legs[idx].dropoffAddress = _data.dropoffAddress;
            legs[idx].dropoffLat = _data.dropoffLat;
            legs[idx].dropoffLng = _data.dropoffLng;
            legs[idx].pickupDatetime = _data.pickupDatetime;
            legs[idx].flightNumber = _data.flightNumber;
            legs[idx].pricingData = _data.pricingData;
            legs[idx].vehicleOptions = _data.vehicleOptions;
            legs[idx].selectedVehicle = _data.selectedVehicle;
            legs[idx].selectedExtras = _data.selectedExtras;
            legs[idx].quoteData = _data.quoteData;
            legs[idx].bookingId = _data.bookingId;
            legs[idx].bookingRef = _data.bookingRef;
            legs[idx].paymentRef = _data.paymentRef;
            legs[idx].totalPrice = _data.totalPrice;
            _data.legs = legs;
        }
    };

    // Initialize
    TB.State.load();
})();
