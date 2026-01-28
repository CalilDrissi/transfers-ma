/**
 * Step 1: Route & Time selection.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    // Fallback Morocco locations when Google Maps is unavailable
    var FALLBACK_LOCATIONS = [
        { name: 'Marrakech Menara Airport', type: 'Airport', lat: 31.6069, lng: -8.0363 },
        { name: 'Marrakech Medina', type: 'City Center', lat: 31.6295, lng: -7.9811 },
        { name: 'Casablanca Mohammed V Airport', type: 'Airport', lat: 33.3675, lng: -7.5898 },
        { name: 'Casablanca City Center', type: 'City', lat: 33.5731, lng: -7.5898 },
        { name: 'Fes Saiss Airport', type: 'Airport', lat: 33.9273, lng: -4.9779 },
        { name: 'Fes Medina', type: 'City Center', lat: 34.0331, lng: -5.0003 },
        { name: 'Agadir Al Massira Airport', type: 'Airport', lat: 30.3250, lng: -9.4131 },
        { name: 'Agadir City Center', type: 'City', lat: 30.4278, lng: -9.5981 },
        { name: 'Tangier Ibn Battouta Airport', type: 'Airport', lat: 35.7269, lng: -5.9169 },
        { name: 'Tangier City Center', type: 'City', lat: 35.7595, lng: -5.8340 },
        { name: 'Essaouira', type: 'City', lat: 31.5085, lng: -9.7595 },
        { name: 'Ouarzazate', type: 'City', lat: 30.9189, lng: -6.8936 },
        { name: 'Chefchaouen', type: 'City', lat: 35.1688, lng: -5.2636 },
        { name: 'Rabat', type: 'Capital City', lat: 34.0209, lng: -6.8416 },
        { name: 'Meknes', type: 'City', lat: 33.8935, lng: -5.5547 }
    ];

    var pickupAutocomplete = null;
    var dropoffAutocomplete = null;

    TB.Step1 = {

        init: function () {
            this.populateTransferTypes();
            this.setMinDatetime();
            this.bindEvents();
            this.initAutocomplete();
            this.restoreState();
            this.toggleFeatures();
        },

        populateTransferTypes: function () {
            var select = document.getElementById('tb-transfer-type');
            if (!select) return;
            var types = tbConfig.transferTypes || [];
            for (var i = 0; i < types.length; i++) {
                var opt = document.createElement('option');
                opt.value = types[i].value;
                opt.textContent = types[i].label;
                select.appendChild(opt);
            }
        },

        setMinDatetime: function () {
            var input = document.getElementById('tb-pickup-datetime');
            if (!input) return;
            var now = new Date();
            now.setMinutes(now.getMinutes() + 60); // at least 1 hour ahead
            var iso = now.toISOString().slice(0, 16);
            input.setAttribute('min', iso);
            // Set default to tomorrow 10:00 if empty
            if (!input.value) {
                var tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(10, 0, 0, 0);
                input.value = tomorrow.toISOString().slice(0, 16);
            }
        },

        toggleFeatures: function () {
            // Round trip
            var rtGroup = document.getElementById('tb-round-trip-group');
            if (rtGroup) {
                rtGroup.style.display = tbConfig.enableRoundTrip ? 'block' : 'none';
            }
        },

        bindEvents: function () {
            var self = this;

            // Search button
            var btn = document.getElementById('tb-btn-search');
            if (btn) {
                btn.addEventListener('click', function () {
                    self.onNext();
                });
            }

            // Transfer type change - show/hide flight number
            var typeSelect = document.getElementById('tb-transfer-type');
            if (typeSelect) {
                typeSelect.addEventListener('change', function () {
                    self.toggleFlightNumber();
                    TB.State.set('transferType', this.value);
                });
            }

            // Round trip toggle
            var rtCheckbox = document.getElementById('tb-round-trip');
            if (rtCheckbox) {
                rtCheckbox.addEventListener('change', function () {
                    TB.State.set('isRoundTrip', this.checked);
                    var returnGroup = document.getElementById('tb-return-datetime-group');
                    if (returnGroup) {
                        returnGroup.style.display = this.checked ? 'block' : 'none';
                    }
                });
            }

            // Passengers counter
            var counterBtns = document.querySelectorAll('.tb-counter__btn');
            for (var i = 0; i < counterBtns.length; i++) {
                counterBtns[i].addEventListener('click', function () {
                    var target = document.getElementById(this.getAttribute('data-target'));
                    if (!target) return;
                    var val = parseInt(target.value) || 1;
                    var min = parseInt(target.getAttribute('min')) || 1;
                    var max = parseInt(target.getAttribute('max')) || 20;
                    if (this.getAttribute('data-action') === 'increase') {
                        val = Math.min(val + 1, max);
                    } else {
                        val = Math.max(val - 1, min);
                    }
                    target.value = val;
                    TB.State.set('passengers', val);
                });
            }

            // Save datetime on change
            var dtInput = document.getElementById('tb-pickup-datetime');
            if (dtInput) {
                dtInput.addEventListener('change', function () {
                    TB.State.set('pickupDatetime', this.value);
                });
            }

            var returnDt = document.getElementById('tb-return-datetime');
            if (returnDt) {
                returnDt.addEventListener('change', function () {
                    TB.State.set('returnDatetime', this.value);
                });
            }

            var flightInput = document.getElementById('tb-flight-number');
            if (flightInput) {
                flightInput.addEventListener('input', function () {
                    TB.State.set('flightNumber', this.value);
                });
            }
        },

        toggleFlightNumber: function () {
            var type = document.getElementById('tb-transfer-type').value;
            var flightGroup = document.getElementById('tb-flight-group');
            if (!flightGroup) return;
            var isAirport = type === 'airport_pickup' || type === 'airport_dropoff';
            flightGroup.style.display = (isAirport && tbConfig.enableFlightNumber) ? 'block' : 'none';
        },

        initAutocomplete: function () {
            if (window.google && google.maps && google.maps.places) {
                this.setupGoogleAutocomplete();
            } else if (!tbConfig.googleMapsApiKey) {
                // Try fetching from API, otherwise use fallback
                var self = this;
                TB.API.getGoogleMapsConfig().then(function (data) {
                    if (data && data.api_key && data.enabled) {
                        self.loadGoogleMapsScript(data.api_key);
                    } else {
                        self.setupFallbackAutocomplete();
                    }
                }).catch(function () {
                    self.setupFallbackAutocomplete();
                });
            } else {
                // Google Maps script should be loading via wp_enqueue
                this.setupFallbackAutocomplete();
                // Re-check after a delay
                var self = this;
                setTimeout(function () {
                    if (window.google && google.maps && google.maps.places) {
                        self.setupGoogleAutocomplete();
                    }
                }, 2000);
            }
        },

        loadGoogleMapsScript: function (apiKey) {
            var self = this;
            var script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=places';
            script.async = true;
            script.onload = function () {
                self.setupGoogleAutocomplete();
            };
            script.onerror = function () {
                self.setupFallbackAutocomplete();
            };
            document.head.appendChild(script);
        },

        setupGoogleAutocomplete: function () {
            var moroccoBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(27.6, -13.2),
                new google.maps.LatLng(35.9, -1.0)
            );

            var options = {
                bounds: moroccoBounds,
                componentRestrictions: { country: 'ma' },
                fields: ['formatted_address', 'geometry', 'name'],
                strictBounds: false
            };

            var pickupInput = document.getElementById('tb-pickup-location');
            var dropoffInput = document.getElementById('tb-dropoff-location');

            if (pickupInput) {
                pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, options);
                pickupAutocomplete.addListener('place_changed', function () {
                    var place = pickupAutocomplete.getPlace();
                    if (place.geometry) {
                        TB.State.set('pickupAddress', place.formatted_address || place.name);
                        TB.State.set('pickupLat', place.geometry.location.lat());
                        TB.State.set('pickupLng', place.geometry.location.lng());
                    }
                });
                pickupInput.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') e.preventDefault();
                });
            }

            if (dropoffInput) {
                dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, options);
                dropoffAutocomplete.addListener('place_changed', function () {
                    var place = dropoffAutocomplete.getPlace();
                    if (place.geometry) {
                        TB.State.set('dropoffAddress', place.formatted_address || place.name);
                        TB.State.set('dropoffLat', place.geometry.location.lat());
                        TB.State.set('dropoffLng', place.geometry.location.lng());
                    }
                });
                dropoffInput.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') e.preventDefault();
                });
            }
        },

        setupFallbackAutocomplete: function () {
            this._setupFallback('tb-pickup-location', 'tb-pickup-dropdown', 'pickup');
            this._setupFallback('tb-dropoff-location', 'tb-dropoff-dropdown', 'dropoff');
        },

        _setupFallback: function (inputId, dropdownId, type) {
            var input = document.getElementById(inputId);
            var dropdown = document.getElementById(dropdownId);
            if (!input || !dropdown) return;

            input.addEventListener('input', function () {
                var query = input.value.toLowerCase();
                if (query.length < 2) {
                    dropdown.classList.remove('tb-show');
                    return;
                }

                var matches = FALLBACK_LOCATIONS.filter(function (loc) {
                    return loc.name.toLowerCase().indexOf(query) !== -1 ||
                           loc.type.toLowerCase().indexOf(query) !== -1;
                });

                if (matches.length === 0) {
                    dropdown.classList.remove('tb-show');
                    return;
                }

                var html = '';
                for (var i = 0; i < matches.length; i++) {
                    var loc = matches[i];
                    html += '<div class="tb-autocomplete-item" data-name="' + TB.Utils.escapeHtml(loc.name) +
                        '" data-lat="' + loc.lat + '" data-lng="' + loc.lng + '" data-type="' + type + '">' +
                        '<span class="tb-autocomplete-item__icon">' +
                        (loc.type.indexOf('Airport') !== -1 ? '&#9992;' : '&#9679;') +
                        '</span>' +
                        '<div><div class="tb-autocomplete-item__name">' + TB.Utils.escapeHtml(loc.name) + '</div>' +
                        '<div class="tb-autocomplete-item__type">' + TB.Utils.escapeHtml(loc.type) + '</div></div></div>';
                }
                dropdown.innerHTML = html;
                dropdown.classList.add('tb-show');

                // Bind click events
                var items = dropdown.querySelectorAll('.tb-autocomplete-item');
                for (var j = 0; j < items.length; j++) {
                    items[j].addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        var el = this;
                        var name = el.getAttribute('data-name');
                        var lat = parseFloat(el.getAttribute('data-lat'));
                        var lng = parseFloat(el.getAttribute('data-lng'));
                        var t = el.getAttribute('data-type');

                        input.value = name;
                        dropdown.classList.remove('tb-show');

                        if (t === 'pickup') {
                            TB.State.set('pickupAddress', name);
                            TB.State.set('pickupLat', lat);
                            TB.State.set('pickupLng', lng);
                        } else {
                            TB.State.set('dropoffAddress', name);
                            TB.State.set('dropoffLat', lat);
                            TB.State.set('dropoffLng', lng);
                        }
                    });
                }
            });

            input.addEventListener('blur', function () {
                setTimeout(function () {
                    dropdown.classList.remove('tb-show');
                }, 200);
            });
        },

        restoreState: function () {
            var s = TB.State.getAll();

            var typeSelect = document.getElementById('tb-transfer-type');
            if (typeSelect && s.transferType) typeSelect.value = s.transferType;

            var pickupInput = document.getElementById('tb-pickup-location');
            if (pickupInput && s.pickupAddress) pickupInput.value = s.pickupAddress;

            var dropoffInput = document.getElementById('tb-dropoff-location');
            if (dropoffInput && s.dropoffAddress) dropoffInput.value = s.dropoffAddress;

            var dtInput = document.getElementById('tb-pickup-datetime');
            if (dtInput && s.pickupDatetime) dtInput.value = s.pickupDatetime;

            var passInput = document.getElementById('tb-passengers');
            if (passInput && s.passengers) passInput.value = s.passengers;

            var rtCheckbox = document.getElementById('tb-round-trip');
            if (rtCheckbox && s.isRoundTrip) {
                rtCheckbox.checked = true;
                var returnGroup = document.getElementById('tb-return-datetime-group');
                if (returnGroup) returnGroup.style.display = 'block';
            }

            var returnDt = document.getElementById('tb-return-datetime');
            if (returnDt && s.returnDatetime) returnDt.value = s.returnDatetime;

            var flightInput = document.getElementById('tb-flight-number');
            if (flightInput && s.flightNumber) flightInput.value = s.flightNumber;

            this.toggleFlightNumber();
        },

        validate: function () {
            TB.Utils.clearFieldErrors();
            var errors = [];

            var type = document.getElementById('tb-transfer-type').value;
            if (!type) {
                errors.push({ field: 'transferType', msg: tbConfig.i18n.selectType });
            }

            if (!TB.State.get('pickupAddress') || !TB.State.get('pickupLat')) {
                errors.push({ field: 'pickup', msg: tbConfig.i18n.selectPickup });
            }

            if (!TB.State.get('dropoffAddress') || !TB.State.get('dropoffLat')) {
                errors.push({ field: 'dropoff', msg: tbConfig.i18n.selectDropoff });
            }

            var dt = document.getElementById('tb-pickup-datetime').value;
            if (!dt) {
                errors.push({ field: 'datetime', msg: tbConfig.i18n.selectDatetime });
            }

            if (TB.State.get('isRoundTrip')) {
                var returnDt = document.getElementById('tb-return-datetime').value;
                if (!returnDt) {
                    errors.push({ field: 'returnDatetime', msg: tbConfig.i18n.returnDateRequired });
                }
            }

            for (var i = 0; i < errors.length; i++) {
                TB.Utils.showFieldError(errors[i].field, errors[i].msg);
            }

            return errors.length === 0;
        },

        saveState: function () {
            TB.State.set('transferType', document.getElementById('tb-transfer-type').value);
            TB.State.set('pickupDatetime', document.getElementById('tb-pickup-datetime').value);
            TB.State.set('passengers', parseInt(document.getElementById('tb-passengers').value) || 1);

            var rtCheckbox = document.getElementById('tb-round-trip');
            if (rtCheckbox) {
                TB.State.set('isRoundTrip', rtCheckbox.checked);
            }

            var returnDt = document.getElementById('tb-return-datetime');
            if (returnDt) {
                TB.State.set('returnDatetime', returnDt.value);
            }

            var flightInput = document.getElementById('tb-flight-number');
            if (flightInput) {
                TB.State.set('flightNumber', flightInput.value);
            }

            TB.State.save();
        },

        onNext: function () {
            this.saveState();

            if (!this.validate()) {
                return false;
            }

            TB.Wizard.showStep(2);
            return true;
        }
    };
})();
