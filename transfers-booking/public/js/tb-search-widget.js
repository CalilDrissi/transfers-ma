/**
 * Search widget — multi-instance, scoped DOM queries.
 * Each [transfers_search] on the page gets its own instance.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var STEPPER_LIMITS = {
        adults: { min: 1, max: 20, def: 2 },
        children: { min: 0, max: 10, def: 0 },
        checked_bags: { min: 0, max: 20, def: 2 },
        hand_luggage: { min: 0, max: 10, def: 0 },
        hourly_adults: { min: 1, max: 20, def: 2 },
        trips_adults: { min: 1, max: 20, def: 2 },
        trips_children: { min: 0, max: 10, def: 0 }
    };

    TB.SearchWidget = {

        instances: [],

        init: function () {
            var containers = document.querySelectorAll('.tb-search-widget');
            for (var i = 0; i < containers.length; i++) {
                this.instances.push(this.createInstance(containers[i]));
            }
        },

        createInstance: function (container) {
            var inst = {
                el: container,
                instanceId: container.getAttribute('data-instance'),
                autocompletes: {},
                state: {
                    // Transfers
                    from: '', from_lat: '', from_lng: '', from_address: '',
                    to: '', to_lat: '', to_lng: '', to_address: '',
                    date: '', return_date: '',
                    adults: 2, children: 0, checked_bags: 2, hand_luggage: 0,
                    has_return: false,
                    // Hourly
                    hourly_city: '', hourly_city_lat: '', hourly_city_lng: '', hourly_city_address: '',
                    hourly_date: '', hourly_hours: 2, hourly_adults: 2,
                    // Trips
                    trips_departure: '', trips_departure_lat: '', trips_departure_lng: '', trips_departure_address: '',
                    trips_date: '', trips_adults: 2, trips_children: 0
                },
                activeService: 'transfers'
            };

            // Scoped selectors
            inst.q = function (sel) { return inst.el.querySelector(sel); };
            inst.qAll = function (sel) { return inst.el.querySelectorAll(sel); };

            initTabs(inst);
            initAutocomplete(inst);
            initReturnToggle(inst);
            initSteppers(inst);
            initDropdowns(inst);
            initSearch(inst);
            initKeyboard(inst);

            return inst;
        }
    };

    /* ── Tabs ─────────────────────────────────── */

    function initTabs(inst) {
        var tabs = inst.qAll('.tb-search-widget__tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', (function (tab) {
                return function () {
                    var service = tab.getAttribute('data-service');
                    // Update tab active state
                    var allTabs = inst.qAll('.tb-search-widget__tab');
                    for (var j = 0; j < allTabs.length; j++) {
                        allTabs[j].classList.toggle('tb-search-widget__tab--active', allTabs[j] === tab);
                    }
                    // Show/hide forms
                    var forms = inst.qAll('.tb-search-widget__form');
                    for (var k = 0; k < forms.length; k++) {
                        var isActive = forms[k].getAttribute('data-service') === service;
                        forms[k].classList.toggle('tb-search-widget__form--active', isActive);
                    }
                    inst.activeService = service;
                };
            })(tabs[i]));
        }
    }

    /* ── Google Places Autocomplete ───────────── */

    function initAutocomplete(inst) {
        var fields = ['from', 'to', 'hourly_city', 'trips_departure'];
        for (var i = 0; i < fields.length; i++) {
            setupFieldAutocomplete(inst, fields[i]);
        }
    }

    function setupFieldAutocomplete(inst, fieldName) {
        var input = inst.q('[data-field="' + fieldName + '"]');
        if (!input) return;

        var panel = inst.q('.tb-search-widget__autocomplete[data-for="' + fieldName + '"]');
        if (!panel) return;

        // Try Google Places
        if (window.google && window.google.maps && window.google.maps.places) {
            var autocomplete = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: 'ma' },
                language: (typeof tbConfig !== 'undefined' && tbConfig.lang) ? tbConfig.lang : 'en',
                fields: ['formatted_address', 'geometry', 'name']
            });

            autocomplete.addListener('place_changed', function () {
                var place = autocomplete.getPlace();
                if (place && place.geometry) {
                    inst.state[fieldName] = place.name || place.formatted_address;
                    inst.state[fieldName + '_lat'] = place.geometry.location.lat();
                    inst.state[fieldName + '_lng'] = place.geometry.location.lng();
                    inst.state[fieldName + '_address'] = place.formatted_address || '';
                    setHidden(inst, fieldName + '_lat', inst.state[fieldName + '_lat']);
                    setHidden(inst, fieldName + '_lng', inst.state[fieldName + '_lng']);
                    setHidden(inst, fieldName + '_address', inst.state[fieldName + '_address']);
                }
            });
            inst.autocompletes[fieldName] = autocomplete;
        } else {
            // Fallback: simple autocomplete with predefined Morocco locations
            setupFallbackAutocomplete(inst, input, panel, fieldName);
        }
    }

    var FALLBACK_LOCATIONS = [
        { name: 'Marrakech Menara Airport', lat: 31.6069, lng: -8.0363 },
        { name: 'Marrakech City Center', lat: 31.6295, lng: -7.9811 },
        { name: 'Casablanca Mohammed V Airport', lat: 33.3675, lng: -7.5898 },
        { name: 'Casablanca City Center', lat: 33.5731, lng: -7.5898 },
        { name: 'Rabat', lat: 34.0209, lng: -6.8416 },
        { name: 'Fes', lat: 34.0181, lng: -5.0078 },
        { name: 'Tangier', lat: 35.7595, lng: -5.8340 },
        { name: 'Agadir', lat: 30.4278, lng: -9.5981 },
        { name: 'Essaouira', lat: 31.5085, lng: -9.7595 },
        { name: 'Ouarzazate', lat: 30.9189, lng: -6.8934 },
        { name: 'Chefchaouen', lat: 35.1688, lng: -5.2636 },
        { name: 'Meknes', lat: 33.8935, lng: -5.5547 },
        { name: 'Merzouga', lat: 31.0801, lng: -4.0134 },
        { name: 'Imlil', lat: 31.1372, lng: -7.9194 },
        { name: 'Ait Ben Haddou', lat: 31.0470, lng: -7.1299 }
    ];

    function setupFallbackAutocomplete(inst, input, panel, fieldName) {
        var debounceTimer;

        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                var val = input.value.trim().toLowerCase();
                if (val.length < 2) {
                    closePanel(panel);
                    return;
                }
                var matches = FALLBACK_LOCATIONS.filter(function (loc) {
                    return loc.name.toLowerCase().indexOf(val) !== -1;
                });
                if (matches.length === 0) {
                    closePanel(panel);
                    return;
                }
                panel.innerHTML = '';
                for (var i = 0; i < matches.length; i++) {
                    var item = document.createElement('div');
                    item.className = 'tb-search-widget__autocomplete-item';
                    item.textContent = matches[i].name;
                    item.setAttribute('data-lat', matches[i].lat);
                    item.setAttribute('data-lng', matches[i].lng);
                    item.addEventListener('click', (function (loc) {
                        return function () {
                            input.value = loc.name;
                            inst.state[fieldName] = loc.name;
                            inst.state[fieldName + '_lat'] = loc.lat;
                            inst.state[fieldName + '_lng'] = loc.lng;
                            inst.state[fieldName + '_address'] = loc.name;
                            setHidden(inst, fieldName + '_lat', loc.lat);
                            setHidden(inst, fieldName + '_lng', loc.lng);
                            setHidden(inst, fieldName + '_address', loc.name);
                            closePanel(panel);
                        };
                    })(matches[i]));
                    panel.appendChild(item);
                }
                panel.classList.add('tb-search-widget__autocomplete--open');
            }, 200);
        });

        input.addEventListener('blur', function () {
            setTimeout(function () { closePanel(panel); }, 200);
        });
    }

    function closePanel(panel) {
        panel.classList.remove('tb-search-widget__autocomplete--open');
    }

    function setHidden(inst, fieldName, value) {
        var el = inst.q('[data-field="' + fieldName + '"]');
        if (el) el.value = value;
    }

    /* ── Return Date Toggle ───────────────────── */

    function initReturnToggle(inst) {
        var addBtn = inst.q('[data-action="add-return"]');
        var removeBtn = inst.q('[data-action="remove-return"]');
        if (!addBtn || !removeBtn) return;

        var toggle = addBtn.closest('.tb-search-widget__return-toggle');
        var datePart = inst.q('.tb-search-widget__return-date');

        addBtn.addEventListener('click', function () {
            inst.state.has_return = true;
            toggle.style.display = 'none';
            datePart.style.display = 'flex';
        });

        removeBtn.addEventListener('click', function () {
            inst.state.has_return = false;
            toggle.style.display = 'flex';
            datePart.style.display = 'none';
            var returnInput = inst.q('[data-field="return_date"]');
            if (returnInput) returnInput.value = '';
            inst.state.return_date = '';
        });
    }

    /* ── Steppers ─────────────────────────────── */

    function initSteppers(inst) {
        var btns = inst.qAll('.tb-search-widget__stepper-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', (function (btn) {
                return function (e) {
                    e.stopPropagation();
                    var target = btn.getAttribute('data-target');
                    var action = btn.getAttribute('data-action');
                    var limits = STEPPER_LIMITS[target];
                    if (!limits) return;

                    var current = inst.state[target] !== undefined ? inst.state[target] : limits.def;
                    if (action === 'increment' && current < limits.max) {
                        current++;
                    } else if (action === 'decrement' && current > limits.min) {
                        current--;
                    }
                    inst.state[target] = current;

                    // Update display
                    var valueEl = inst.q('[data-value="' + target + '"]');
                    if (valueEl) valueEl.textContent = current;

                    // Update stepper button states
                    updateStepperLimits(inst, target);

                    // Update counter display text
                    updateCounterDisplay(inst, target);
                };
            })(btns[i]));
        }
    }

    function updateStepperLimits(inst, target) {
        var limits = STEPPER_LIMITS[target];
        if (!limits) return;
        var val = inst.state[target];
        var decBtn = inst.q('[data-action="decrement"][data-target="' + target + '"]');
        var incBtn = inst.q('[data-action="increment"][data-target="' + target + '"]');
        if (decBtn) {
            decBtn.toggleAttribute('data-at-limit', val <= limits.min);
            decBtn.disabled = val <= limits.min;
        }
        if (incBtn) {
            incBtn.toggleAttribute('data-at-limit', val >= limits.max);
            incBtn.disabled = val >= limits.max;
        }
    }

    function updateCounterDisplay(inst, target) {
        var i18n = (typeof tbConfig !== 'undefined' && tbConfig.i18n) ? tbConfig.i18n : {};

        // Map stepper targets to their display elements
        if (target === 'adults' || target === 'children') {
            var total = inst.state.adults + inst.state.children;
            var label = total === 1 ? (i18n.passenger || 'Passenger') : (i18n.passengersLabel || 'Passengers');
            var display = inst.q('[data-display="passengers"]');
            if (display) display.textContent = total + ' ' + label;
        }
        if (target === 'checked_bags' || target === 'hand_luggage') {
            var totalBags = inst.state.checked_bags + inst.state.hand_luggage;
            var bagLabel = totalBags === 1 ? (i18n.bag || 'Bag') : (i18n.bagsLabel || 'Bags');
            var bagDisplay = inst.q('[data-display="luggage"]');
            if (bagDisplay) bagDisplay.textContent = totalBags + ' ' + bagLabel;
        }
        if (target === 'hourly_adults') {
            var hDisplay = inst.q('[data-display="hourly_passengers"]');
            if (hDisplay) hDisplay.textContent = inst.state.hourly_adults + ' ' + (i18n.passengersLabel || 'Passengers');
        }
        if (target === 'trips_adults' || target === 'trips_children') {
            var tripTotal = inst.state.trips_adults + inst.state.trips_children;
            var tripLabel = tripTotal === 1 ? (i18n.participant || 'Participant') : (i18n.participantsLabel || 'Participants');
            var tripDisplay = inst.q('[data-display="trips_participants"]');
            if (tripDisplay) tripDisplay.textContent = tripTotal + ' ' + tripLabel;
        }
    }

    /* ── Dropdowns ────────────────────────────── */

    function initDropdowns(inst) {
        // Toggle dropdown on counter button click
        var counterBtns = inst.qAll('[data-dropdown]');
        for (var i = 0; i < counterBtns.length; i++) {
            counterBtns[i].addEventListener('click', (function (btn) {
                return function (e) {
                    e.stopPropagation();
                    var panelName = btn.getAttribute('data-dropdown');
                    var panel = inst.q('[data-dropdown-panel="' + panelName + '"]');
                    if (!panel) return;

                    // Close all other dropdowns in this instance
                    var allPanels = inst.qAll('.tb-search-widget__dropdown');
                    for (var j = 0; j < allPanels.length; j++) {
                        if (allPanels[j] !== panel) {
                            allPanels[j].classList.remove('tb-search-widget__dropdown--open');
                        }
                    }
                    panel.classList.toggle('tb-search-widget__dropdown--open');
                };
            })(counterBtns[i]));
        }

        // Close dropdowns on click outside
        document.addEventListener('click', function (e) {
            if (!inst.el.contains(e.target)) {
                var panels = inst.qAll('.tb-search-widget__dropdown');
                for (var k = 0; k < panels.length; k++) {
                    panels[k].classList.remove('tb-search-widget__dropdown--open');
                }
            }
        });
    }

    /* ── Search Validation & Redirect ─────────── */

    function initSearch(inst) {
        var searchBtns = inst.qAll('[data-action="search"]');
        for (var i = 0; i < searchBtns.length; i++) {
            searchBtns[i].addEventListener('click', function () {
                handleSearch(inst);
            });
        }
    }

    function handleSearch(inst) {
        // Read current field values into state
        syncFieldsToState(inst);

        if (inst.activeService === 'transfers') {
            if (!validateTransfers(inst)) return;
            redirectTransfers(inst);
        } else if (inst.activeService === 'hourly') {
            if (!validateHourly(inst)) return;
            redirectHourly(inst);
        } else if (inst.activeService === 'trips') {
            if (!validateTrips(inst)) return;
            redirectTrips(inst);
        }
    }

    function syncFieldsToState(inst) {
        var fields = ['date', 'return_date', 'hourly_date', 'hourly_hours', 'trips_date'];
        for (var i = 0; i < fields.length; i++) {
            var el = inst.q('[data-field="' + fields[i] + '"]');
            if (el) inst.state[fields[i]] = el.value;
        }
        // For select
        var hoursEl = inst.q('[data-field="hourly_hours"]');
        if (hoursEl) inst.state.hourly_hours = parseInt(hoursEl.value, 10) || 2;
    }

    function validateTransfers(inst) {
        var errors = [];
        var bar = inst.q('.tb-search-widget__form--active .tb-search-widget__bar');

        // Clear previous validation
        clearValidation(inst);

        if (!inst.state.from_lat || !inst.state.from_lng) {
            markInvalid(inst, 'from');
            errors.push('from');
        }
        if (!inst.state.to_lat || !inst.state.to_lng) {
            markInvalid(inst, 'to');
            errors.push('to');
        }
        if (!inst.state.date) {
            markInvalid(inst, 'date');
            errors.push('date');
        } else {
            // Must be at least 2 hours in future
            var pickupDate = new Date(inst.state.date);
            var minDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
            if (pickupDate < minDate) {
                markInvalid(inst, 'date');
                errors.push('date');
            }
        }

        // Return date validation
        if (inst.state.has_return && inst.state.return_date) {
            var returnDate = new Date(inst.state.return_date);
            var departDate = new Date(inst.state.date);
            if (returnDate <= departDate) {
                markInvalid(inst, 'return_date');
                errors.push('return_date');
            }
        }

        if (errors.length > 0) {
            shakeBar(bar);
            setTimeout(function () { clearValidation(inst); }, 2000);
            return false;
        }
        return true;
    }

    function validateHourly(inst) {
        var errors = [];
        var bar = inst.q('.tb-search-widget__form--active .tb-search-widget__bar');
        clearValidation(inst);

        if (!inst.state.hourly_city_lat || !inst.state.hourly_city_lng) {
            markInvalid(inst, 'hourly_city');
            errors.push('hourly_city');
        }
        if (!inst.state.hourly_date) {
            markInvalid(inst, 'hourly_date');
            errors.push('hourly_date');
        }

        if (errors.length > 0) {
            shakeBar(bar);
            setTimeout(function () { clearValidation(inst); }, 2000);
            return false;
        }
        return true;
    }

    function validateTrips(inst) {
        var errors = [];
        var bar = inst.q('.tb-search-widget__form--active .tb-search-widget__bar');
        clearValidation(inst);

        if (!inst.state.trips_departure_lat || !inst.state.trips_departure_lng) {
            markInvalid(inst, 'trips_departure');
            errors.push('trips_departure');
        }
        if (!inst.state.trips_date) {
            markInvalid(inst, 'trips_date');
            errors.push('trips_date');
        }

        if (errors.length > 0) {
            shakeBar(bar);
            setTimeout(function () { clearValidation(inst); }, 2000);
            return false;
        }
        return true;
    }

    function markInvalid(inst, fieldName) {
        var field = inst.q('[data-field="' + fieldName + '"]');
        if (field) {
            var wrapper = field.closest('.tb-search-widget__field');
            if (wrapper) wrapper.classList.add('tb-search-widget__field--invalid');
        }
    }

    function clearValidation(inst) {
        var invalids = inst.qAll('.tb-search-widget__field--invalid');
        for (var i = 0; i < invalids.length; i++) {
            invalids[i].classList.remove('tb-search-widget__field--invalid');
        }
        var bars = inst.qAll('.tb-search-widget__bar--shake');
        for (var j = 0; j < bars.length; j++) {
            bars[j].classList.remove('tb-search-widget__bar--shake');
        }
    }

    function shakeBar(bar) {
        if (!bar) return;
        bar.classList.add('tb-search-widget__bar--shake');
        setTimeout(function () {
            bar.classList.remove('tb-search-widget__bar--shake');
        }, 400);
    }

    /* ── Redirects ────────────────────────────── */

    function redirectTransfers(inst) {
        var cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        var baseUrl = cfg.resultsPageUrl || '/book-transfer/';
        var passengers = inst.state.adults + inst.state.children;
        var luggage = inst.state.checked_bags + inst.state.hand_luggage;

        var params = new URLSearchParams();
        params.set('from', inst.state.from || inst.state.from_address);
        params.set('from_lat', inst.state.from_lat);
        params.set('from_lng', inst.state.from_lng);
        params.set('to', inst.state.to || inst.state.to_address);
        params.set('to_lat', inst.state.to_lat);
        params.set('to_lng', inst.state.to_lng);
        params.set('date', inst.state.date);
        params.set('passengers', passengers);
        params.set('luggage', luggage);
        params.set('adults', inst.state.adults);
        params.set('children', inst.state.children);

        if (inst.state.has_return && inst.state.return_date) {
            params.set('return_date', inst.state.return_date);
        }

        window.location.href = baseUrl + '?' + params.toString();
    }

    function redirectHourly(inst) {
        var cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        var baseUrl = cfg.resultsPageUrl || '/book-transfer/';

        var params = new URLSearchParams();
        params.set('type', 'hourly');
        params.set('city', inst.state.hourly_city || inst.state.hourly_city_address);
        params.set('city_lat', inst.state.hourly_city_lat);
        params.set('city_lng', inst.state.hourly_city_lng);
        params.set('date', inst.state.hourly_date);
        params.set('hours', inst.state.hourly_hours);
        params.set('passengers', inst.state.hourly_adults);

        window.location.href = baseUrl + '?' + params.toString();
    }

    function redirectTrips(inst) {
        var cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        var baseUrl = cfg.toursPageUrl || '/tours/';
        var participants = inst.state.trips_adults + inst.state.trips_children;

        var params = new URLSearchParams();
        params.set('departure', inst.state.trips_departure || inst.state.trips_departure_address);
        params.set('departure_lat', inst.state.trips_departure_lat);
        params.set('departure_lng', inst.state.trips_departure_lng);
        params.set('date', inst.state.trips_date);
        params.set('participants', participants);

        window.location.href = baseUrl + '?' + params.toString();
    }

    /* ── Keyboard ─────────────────────────────── */

    function initKeyboard(inst) {
        inst.el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(inst);
            }
            if (e.key === 'Escape') {
                // Close all dropdowns and autocompletes
                var panels = inst.qAll('.tb-search-widget__dropdown');
                for (var i = 0; i < panels.length; i++) {
                    panels[i].classList.remove('tb-search-widget__dropdown--open');
                }
                var autos = inst.qAll('.tb-search-widget__autocomplete');
                for (var j = 0; j < autos.length; j++) {
                    autos[j].classList.remove('tb-search-widget__autocomplete--open');
                }
            }
        });
    }

    /* ── Init on DOMContentLoaded ─────────────── */

    document.addEventListener('DOMContentLoaded', function () {
        TB.SearchWidget.init();
    });

})();
