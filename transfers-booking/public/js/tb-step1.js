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

            var btn = document.getElementById('tb-btn-search');
            var container = document.getElementById('tb-no-route-container');
            var originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = tbConfig.i18n.loading || 'Loading...';
            container.style.display = 'none';

            var state = TB.State.getAll();
            TB.API.getPricing(
                state.pickupLat,
                state.pickupLng,
                state.dropoffLat,
                state.dropoffLng,
                state.passengers
            ).then(function (data) {
                btn.disabled = false;
                btn.textContent = originalText;

                // No-route check
                if (data.pricing_type === 'calculated' && tbConfig.showNoRouteMessage) {
                    TB.Step1.showNoRouteMessage(container);
                    return;
                }

                // Min booking hours check
                var minHours = data.min_booking_hours;
                if (minHours && state.pickupDatetime) {
                    var pickupTime = new Date(state.pickupDatetime).getTime();
                    var now = Date.now();
                    var hoursUntilPickup = (pickupTime - now) / (1000 * 60 * 60);
                    if (hoursUntilPickup < minHours) {
                        TB.Step1.showMinTimeMessage(container, minHours);
                        return;
                    }
                }

                container.style.display = 'none';
                TB.Wizard.showStep(2);
            }).catch(function () {
                btn.disabled = false;
                btn.textContent = originalText;
                if (tbConfig.showNoRouteMessage) {
                    TB.Step1.showNoRouteMessage(container);
                } else {
                    // Let step 2 handle the error
                    TB.Wizard.showStep(2);
                }
            });
            return false;
        },

        showNoRouteMessage: function (container) {
            var contact = tbConfig.contact || {};
            var message = tbConfig.noRouteMessage || '';

            var html = '<div class="tb-no-route">';
            html += '<div class="tb-no-route__icon">';
            html += '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
            html += '</div>';
            if (message) {
                html += '<div class="tb-no-route__message">' + TB.Utils.escapeHtml(message) + '</div>';
            }
            html += '<div class="tb-no-route__contacts">';
            if (contact.phone) {
                html += '<a href="tel:' + TB.Utils.escapeHtml(contact.phone) + '" class="tb-no-route__contact-btn tb-no-route__contact-btn--phone">';
                html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
                html += ' ' + TB.Utils.escapeHtml(contact.phone);
                html += '</a>';
            }
            if (contact.email) {
                html += '<a href="mailto:' + TB.Utils.escapeHtml(contact.email) + '" class="tb-no-route__contact-btn tb-no-route__contact-btn--email">';
                html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
                html += ' ' + TB.Utils.escapeHtml(contact.email);
                html += '</a>';
            }
            if (contact.whatsapp) {
                html += '<a href="https://wa.me/' + TB.Utils.escapeHtml(contact.whatsapp) + '" target="_blank" rel="noopener" class="tb-no-route__contact-btn tb-no-route__contact-btn--whatsapp">';
                html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
                html += ' WhatsApp';
                html += '</a>';
            }
            html += '</div>';
            html += '</div>';

            container.innerHTML = html;
            container.style.display = 'block';
        },

        showMinTimeMessage: function (container, minHours) {
            var html = '<div class="tb-alert tb-alert--error" style="margin-top:1rem;">';
            html += '<strong>' + TB.Utils.escapeHtml(
                (tbConfig.i18n.minBookingTime || 'We can only accept bookings for this route with a minimum of {hours} hours notice.')
                    .replace('{hours}', minHours)
            ) + '</strong>';
            html += '</div>';

            container.innerHTML = html;
            container.style.display = 'block';
        }
    };
})();
