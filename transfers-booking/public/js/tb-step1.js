/**
 * Step 1: Route & Time selection — pill-bar UI with multi-city, swap, luggage.
 * Ported from dashboard booking_form_step1.js.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

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

    var autocompleteInstances = {};
    var googleReady = false;
    var googleOptions = null;
    var paxDropdownOpen = false;

    function inferTransferType(pickup, dropoff) {
        var airportRe = /airport|aéroport|aeroport|menara|mohammed v|ibn battouta|al massira|saiss/i;
        var portRe = /port|marina|harbour|harbor/i;
        if (airportRe.test(pickup)) return 'airport_pickup';
        if (airportRe.test(dropoff)) return 'airport_dropoff';
        if (portRe.test(pickup) || portRe.test(dropoff)) return 'port_transfer';
        return 'city_to_city';
    }

    function updateFlightBar() {
        var flightBar = document.getElementById('tb-flight-bar');
        if (!flightBar) return;
        var legs = TB.State.get('legs') || [];
        var mode = TB.State.get('mode');
        var showFlight = false;
        if (mode === 'multi-city') {
            for (var i = 0; i < legs.length; i++) {
                if (legs[i].transferType === 'airport_pickup' || legs[i].transferType === 'airport_dropoff') {
                    showFlight = true; break;
                }
            }
        } else {
            var leg = legs[0];
            if (leg && (leg.transferType === 'airport_pickup' || leg.transferType === 'airport_dropoff')) {
                showFlight = true;
            }
        }
        flightBar.style.display = (showFlight && tbConfig.enableFlightNumber) ? 'block' : 'none';
    }

    TB.Step1 = {
        init: function () {
            this.setMinDatetime();
            this.bindEvents();
            this.initAutocomplete();
            this.restoreState();
        },

        /* ── Mode management ── */
        switchMode: function (mode) {
            TB.State.set('mode', mode);
            var singleBar = document.getElementById('tb-single-bar');
            var multiBar = document.getElementById('tb-multi-bar');
            var returnField = document.getElementById('tb-return-field');

            var tabs = document.querySelectorAll('.tb-mode-tab');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.toggle('tb-mode-tab--active', tabs[i].getAttribute('data-mode') === mode);
            }

            if (mode === 'multi-city') {
                if (singleBar) singleBar.style.display = 'none';
                if (multiBar) multiBar.style.display = 'block';
                var legs = TB.State.get('legs') || [];
                if (legs.length < 2) this.addLeg();
                this.renderAllLegs();
                this.updateReturnToggleVisibility();
            } else {
                var legs2 = TB.State.get('legs') || [];
                if (legs2.length > 0 && legs2[legs2.length - 1].isReturnLeg) {
                    legs2.pop();
                    TB.State.set('legs', legs2);
                }
                var returnCheck = document.getElementById('tb-return-to-start-check');
                if (returnCheck) returnCheck.checked = false;
                var returnToggle = document.getElementById('tb-return-to-start');
                if (returnToggle) returnToggle.style.display = 'none';

                if (singleBar) singleBar.style.display = 'block';
                if (multiBar) multiBar.style.display = 'none';
                if (returnField) {
                    returnField.style.display = (mode === 'round-trip') ? 'flex' : 'none';
                }
                var addReturnBtn = document.getElementById('tb-add-return');
                if (addReturnBtn) {
                    addReturnBtn.style.display = (mode === 'round-trip') ? 'none' : 'block';
                }
                TB.State.set('isRoundTrip', mode === 'round-trip');
            }
            updateFlightBar();
        },

        /* ── Return-to-start toggle ── */
        toggleReturnToStart: function (checked) {
            var legs = TB.State.get('legs') || [];
            if (checked) {
                if (legs.length > 0 && legs[legs.length - 1].isReturnLeg) legs.pop();
                if (legs.length >= 5) return;
                var firstLeg = legs[0];
                var lastRegular = legs[legs.length - 1];
                var returnLeg = {
                    pickupAddress: lastRegular ? lastRegular.dropoffAddress : '',
                    pickupLat: lastRegular ? lastRegular.dropoffLat : null,
                    pickupLng: lastRegular ? lastRegular.dropoffLng : null,
                    dropoffAddress: firstLeg ? firstLeg.pickupAddress : '',
                    dropoffLat: firstLeg ? firstLeg.pickupLat : null,
                    dropoffLng: firstLeg ? firstLeg.pickupLng : null,
                    pickupDatetime: '', transferType: '', flightNumber: '',
                    pricingData: null, vehicleOptions: [], selectedVehicle: null,
                    selectedExtras: [], quoteData: null, bookingId: null,
                    bookingRef: '', paymentRef: '', totalPrice: 0,
                    isReturnLeg: true
                };
                returnLeg.transferType = inferTransferType(returnLeg.pickupAddress || '', returnLeg.dropoffAddress || '');
                legs.push(returnLeg);
                TB.State.set('legs', legs);
            } else {
                if (legs.length > 0 && legs[legs.length - 1].isReturnLeg) {
                    legs.pop();
                    TB.State.set('legs', legs);
                }
            }
            this.renderAllLegs();
            this.updateReturnToggleVisibility();
            updateFlightBar();
        },

        syncReturnLeg: function () {
            var legs = TB.State.get('legs') || [];
            if (legs.length < 2) return;
            var last = legs[legs.length - 1];
            if (!last.isReturnLeg) return;
            var lastRegular = legs[legs.length - 2];
            var firstLeg = legs[0];
            last.pickupAddress = lastRegular ? lastRegular.dropoffAddress : '';
            last.pickupLat = lastRegular ? lastRegular.dropoffLat : null;
            last.pickupLng = lastRegular ? lastRegular.dropoffLng : null;
            last.dropoffAddress = firstLeg ? firstLeg.pickupAddress : '';
            last.dropoffLat = firstLeg ? firstLeg.pickupLat : null;
            last.dropoffLng = firstLeg ? firstLeg.pickupLng : null;
            last.transferType = inferTransferType(last.pickupAddress || '', last.dropoffAddress || '');
            legs[legs.length - 1] = last;
            TB.State.set('legs', legs);
        },

        updateReturnToggleVisibility: function () {
            var legs = TB.State.get('legs') || [];
            var regularCount = legs.filter(function (l) { return !l.isReturnLeg; }).length;
            var toggle = document.getElementById('tb-return-to-start');
            if (toggle) toggle.style.display = regularCount >= 2 ? 'flex' : 'none';
            var addBtn = document.getElementById('tb-add-leg');
            if (addBtn) addBtn.style.display = legs.length >= 5 ? 'none' : 'flex';
        },

        /* ── Leg management (multi-city) ── */
        addLeg: function () {
            var legs = TB.State.get('legs') || [];
            if (legs.length >= 5) return;
            var hadReturn = false;
            if (legs.length > 0 && legs[legs.length - 1].isReturnLeg) {
                hadReturn = true;
                legs.pop();
            }
            var prevLeg = legs.length > 0 ? legs[legs.length - 1] : null;
            var newLeg = {
                pickupAddress: prevLeg ? prevLeg.dropoffAddress : '',
                pickupLat: prevLeg ? prevLeg.dropoffLat : null,
                pickupLng: prevLeg ? prevLeg.dropoffLng : null,
                dropoffAddress: '', dropoffLat: null, dropoffLng: null,
                pickupDatetime: '', transferType: '', flightNumber: '',
                pricingData: null, vehicleOptions: [], selectedVehicle: null,
                selectedExtras: [], quoteData: null, bookingId: null,
                bookingRef: '', paymentRef: '', totalPrice: 0
            };
            legs.push(newLeg);
            TB.State.set('legs', legs);
            if (hadReturn && legs.length < 5) {
                var firstLeg = legs[0];
                var lastRegular = legs[legs.length - 1];
                var returnLeg = {
                    pickupAddress: lastRegular ? lastRegular.dropoffAddress : '',
                    pickupLat: lastRegular ? lastRegular.dropoffLat : null,
                    pickupLng: lastRegular ? lastRegular.dropoffLng : null,
                    dropoffAddress: firstLeg ? firstLeg.pickupAddress : '',
                    dropoffLat: firstLeg ? firstLeg.pickupLat : null,
                    dropoffLng: firstLeg ? firstLeg.pickupLng : null,
                    pickupDatetime: '', transferType: '', flightNumber: '',
                    pricingData: null, vehicleOptions: [], selectedVehicle: null,
                    selectedExtras: [], quoteData: null, bookingId: null,
                    bookingRef: '', paymentRef: '', totalPrice: 0,
                    isReturnLeg: true
                };
                returnLeg.transferType = inferTransferType(returnLeg.pickupAddress || '', returnLeg.dropoffAddress || '');
                legs.push(returnLeg);
                TB.State.set('legs', legs);
            } else if (hadReturn && legs.length >= 5) {
                var returnCheck = document.getElementById('tb-return-to-start-check');
                if (returnCheck) returnCheck.checked = false;
            }
            this.updateReturnToggleVisibility();
            return legs.length - 1;
        },

        removeLeg: function (idx) {
            var legs = TB.State.get('legs') || [];
            if (legs[idx] && legs[idx].isReturnLeg) return;
            var regularCount = legs.filter(function (l) { return !l.isReturnLeg; }).length;
            if (regularCount <= 2) return;
            this.destroyAutocompleteForLeg(idx);
            legs.splice(idx, 1);
            TB.State.set('legs', legs);
            for (var i = idx; i < legs.length; i++) this.destroyAutocompleteForLeg(i + 1);
            this.syncReturnLeg();
            this.renderAllLegs();
            this.updateReturnToggleVisibility();
        },

        renderAllLegs: function () {
            var container = document.getElementById('tb-legs-container');
            if (!container) return;
            var legs = TB.State.get('legs') || [];
            var html = '';
            for (var i = 0; i < legs.length; i++) html += this.renderLegRow(i, legs[i]);
            container.innerHTML = html;
            for (var j = 0; j < legs.length; j++) {
                if (!legs[j].isReturnLeg) this.initAutocompleteForLeg(j);
                this.setMinDatetimeForInput(container.querySelector('[data-leg="' + j + '"][data-field="datetime"]'));
            }
            var addBtn = document.getElementById('tb-add-leg');
            if (addBtn) addBtn.style.display = legs.length >= 5 ? 'none' : 'flex';
            var removeBtns = container.querySelectorAll('.tb-leg-row__remove');
            for (var k = 0; k < removeBtns.length; k++) {
                removeBtns[k].addEventListener('click', function () {
                    var idx = parseInt(this.closest('.tb-leg-row').getAttribute('data-leg-index'));
                    TB.Step1.removeLeg(idx);
                });
            }
            var dtInputs = container.querySelectorAll('input[data-field="datetime"]');
            for (var d = 0; d < dtInputs.length; d++) {
                dtInputs[d].addEventListener('change', function () {
                    var legIdx = parseInt(this.getAttribute('data-leg'));
                    var legs = TB.State.get('legs') || [];
                    if (legs[legIdx]) { legs[legIdx].pickupDatetime = this.value; TB.State.set('legs', legs); }
                });
            }
        },

        renderLegRow: function (idx, leg) {
            var i18n = tbConfig.i18n || {};
            var legs = TB.State.get('legs') || [];
            var isReturn = !!leg.isReturnLeg;
            var regularCount = legs.filter(function (l) { return !l.isReturnLeg; }).length;
            var canRemove = !isReturn && regularCount > 2;
            var rowClass = 'tb-leg-row' + (isReturn ? ' tb-leg-row--return' : '');
            var html = '<div class="' + rowClass + '" data-leg-index="' + idx + '">';
            html += '<div class="tb-leg-row__number">' + (isReturn ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/></svg>' : (idx + 1)) + '</div>';
            html += '<div class="tb-leg-row__fields">';
            html += '<div class="tb-pill-bar__field tb-pill-bar__field--from">';
            html += '<span class="tb-pill-bar__icon"></span>';
            html += '<input type="text" class="tb-pill-bar__input" data-leg="' + idx + '" data-field="pickup" placeholder="' + (i18n.selectPickup || 'From city, airport, or hotel...') + '" autocomplete="off" value="' + TB.Utils.escapeHtml(leg.pickupAddress || '') + '"' + (isReturn ? ' readonly' : '') + '>';
            if (!isReturn) html += '<button type="button" class="tb-pill-bar__clear" style="' + (leg.pickupAddress ? '' : 'display:none;') + '">&times;</button>';
            if (!isReturn) html += '<div class="tb-autocomplete-dropdown" data-leg="' + idx + '" data-dropdown="pickup"></div>';
            html += '</div>';
            html += '<div class="tb-pill-bar__field tb-pill-bar__field--to">';
            html += '<span class="tb-pill-bar__icon"></span>';
            html += '<input type="text" class="tb-pill-bar__input" data-leg="' + idx + '" data-field="dropoff" placeholder="' + (i18n.selectDropoff || 'To city, hotel, or address...') + '" autocomplete="off" value="' + TB.Utils.escapeHtml(leg.dropoffAddress || '') + '"' + (isReturn ? ' readonly' : '') + '>';
            if (!isReturn) html += '<button type="button" class="tb-pill-bar__clear" style="' + (leg.dropoffAddress ? '' : 'display:none;') + '">&times;</button>';
            if (!isReturn) html += '<div class="tb-autocomplete-dropdown" data-leg="' + idx + '" data-dropdown="dropoff"></div>';
            html += '</div>';
            html += '<div class="tb-pill-bar__field tb-pill-bar__field--date">';
            html += '<input type="datetime-local" class="tb-pill-bar__input" data-leg="' + idx + '" data-field="datetime" value="' + (leg.pickupDatetime || '') + '">';
            html += '</div></div>';
            if (canRemove) html += '<button type="button" class="tb-leg-row__remove" title="Remove">&times;</button>';
            html += '</div>';
            return html;
        },

        /* ── Datetime ── */
        setMinDatetime: function () {
            var input = document.querySelector('#tb-single-bar input[data-field="datetime"]');
            this.setMinDatetimeForInput(input);
            var returnInput = document.getElementById('tb-return-datetime');
            this.setMinDatetimeForInput(returnInput);
        },

        setMinDatetimeForInput: function (input) {
            if (!input) return;
            var now = new Date();
            now.setMinutes(now.getMinutes() + 60);
            input.setAttribute('min', now.toISOString().slice(0, 16));
            if (!input.value) {
                var tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(10, 0, 0, 0);
                input.value = tomorrow.toISOString().slice(0, 16);
            }
        },

        /* ── Events ── */
        bindEvents: function () {
            var self = this;
            var modeTabs = document.querySelectorAll('.tb-mode-tab');
            for (var i = 0; i < modeTabs.length; i++) {
                modeTabs[i].addEventListener('click', function () {
                    self.switchMode(this.getAttribute('data-mode'));
                });
            }
            var btn = document.getElementById('tb-btn-search');
            if (btn) btn.addEventListener('click', function () { self.onNext(); });
            var multiBtn = document.getElementById('tb-btn-search-multi');
            if (multiBtn) multiBtn.addEventListener('click', function () { self.onNext(); });
            var dtInput = document.querySelector('#tb-single-bar input[data-field="datetime"]');
            if (dtInput) dtInput.addEventListener('change', function () {
                var legs = TB.State.get('legs') || [];
                if (legs[0]) { legs[0].pickupDatetime = this.value; TB.State.set('legs', legs); }
                TB.State.set('pickupDatetime', this.value);
            });
            var returnDt = document.getElementById('tb-return-datetime');
            if (returnDt) returnDt.addEventListener('change', function () { TB.State.set('returnDatetime', this.value); });
            var addReturnBtn = document.getElementById('tb-add-return');
            if (addReturnBtn) addReturnBtn.addEventListener('click', function () { self.switchMode('round-trip'); });
            var removeReturnBtn = document.getElementById('tb-remove-return');
            if (removeReturnBtn) removeReturnBtn.addEventListener('click', function () {
                self.switchMode('one-way');
                TB.State.set('returnDatetime', '');
                var ri = document.getElementById('tb-return-datetime');
                if (ri) ri.value = '';
            });
            var swapBtn = document.getElementById('tb-swap-btn');
            if (swapBtn) swapBtn.addEventListener('click', function () { self.swapLocations(0); });
            // Clear buttons — delegated from step container
            var step1 = document.getElementById('tb-step-1');
            if (step1) {
                step1.addEventListener('click', function (e) {
                    var clearBtn = e.target.closest ? e.target.closest('.tb-pill-bar__clear') : null;
                    if (!clearBtn || clearBtn.classList.contains('tb-pill-bar__return-remove')) return;
                    var field = clearBtn.closest('.tb-pill-bar__field');
                    if (!field) return;
                    var input = field.querySelector('.tb-pill-bar__input');
                    if (!input) return;
                    input.value = '';
                    input.focus();
                    clearBtn.style.display = 'none';
                    var legIdx = parseInt(input.getAttribute('data-leg')) || 0;
                    var fieldName = input.getAttribute('data-field');
                    var legs = TB.State.get('legs') || [];
                    if (legs[legIdx] && fieldName === 'pickup') {
                        legs[legIdx].pickupAddress = ''; legs[legIdx].pickupLat = null; legs[legIdx].pickupLng = null;
                        legs[legIdx].transferType = '';
                    } else if (legs[legIdx] && fieldName === 'dropoff') {
                        legs[legIdx].dropoffAddress = ''; legs[legIdx].dropoffLat = null; legs[legIdx].dropoffLng = null;
                        legs[legIdx].transferType = '';
                    }
                    TB.State.set('legs', legs);
                    updateFlightBar();
                });
                step1.addEventListener('input', function (e) {
                    if (!e.target.matches || !e.target.matches('.tb-pill-bar__input[data-field="pickup"], .tb-pill-bar__input[data-field="dropoff"]')) return;
                    var field = e.target.closest('.tb-pill-bar__field');
                    if (!field) return;
                    var clearBtn = field.querySelector('.tb-pill-bar__clear');
                    if (clearBtn) clearBtn.style.display = e.target.value ? 'flex' : 'none';
                });
            }
            var flightInput = document.getElementById('tb-flight-number');
            if (flightInput) flightInput.addEventListener('input', function () {
                TB.State.set('flightNumber', this.value);
                var legs = TB.State.get('legs') || [];
                if (legs[0]) { legs[0].flightNumber = this.value; TB.State.set('legs', legs); }
            });
            var paxPill = document.getElementById('tb-pax-pill');
            if (paxPill) paxPill.addEventListener('click', function (e) { e.stopPropagation(); self.togglePaxDropdown(); });
            var stepperBtns = document.querySelectorAll('.tb-pax-stepper__btn');
            for (var s = 0; s < stepperBtns.length; s++) {
                stepperBtns[s].addEventListener('click', function (e) {
                    e.stopPropagation();
                    self.updateCounter(this.getAttribute('data-target'), this.getAttribute('data-action'));
                });
            }
            var paxPillMulti = document.getElementById('tb-pax-pill-multi');
            if (paxPillMulti) paxPillMulti.addEventListener('click', function (e) { e.stopPropagation(); self.togglePaxDropdown(); });
            document.addEventListener('click', function () { if (paxDropdownOpen) self.closePaxDropdown(); });
            var addLegBtn = document.getElementById('tb-add-leg');
            if (addLegBtn) addLegBtn.addEventListener('click', function () { self.addLeg(); self.renderAllLegs(); });
            var returnCheck = document.getElementById('tb-return-to-start-check');
            if (returnCheck) returnCheck.addEventListener('change', function () { self.toggleReturnToStart(this.checked); });
        },

        /* ── Swap ── */
        swapLocations: function (legIdx) {
            var legs = TB.State.get('legs') || [];
            var leg = legs[legIdx];
            if (!leg) return;
            var tmpAddr = leg.pickupAddress; var tmpLat = leg.pickupLat; var tmpLng = leg.pickupLng;
            leg.pickupAddress = leg.dropoffAddress; leg.pickupLat = leg.dropoffLat; leg.pickupLng = leg.dropoffLng;
            leg.dropoffAddress = tmpAddr; leg.dropoffLat = tmpLat; leg.dropoffLng = tmpLng;
            leg.transferType = inferTransferType(leg.pickupAddress || '', leg.dropoffAddress || '');
            legs[legIdx] = leg;
            TB.State.set('legs', legs);
            if (legIdx === 0) TB.State.syncLegToFlat(0);
            var mode = TB.State.get('mode');
            if (mode === 'multi-city') {
                this.renderAllLegs();
            } else {
                var pickupInput = document.querySelector('#tb-single-bar input[data-field="pickup"]');
                var dropoffInput = document.querySelector('#tb-single-bar input[data-field="dropoff"]');
                if (pickupInput) pickupInput.value = leg.pickupAddress || '';
                if (dropoffInput) dropoffInput.value = leg.dropoffAddress || '';
            }
            updateFlightBar();
        },

        /* ── Pax/Luggage dropdown ── */
        togglePaxDropdown: function () { if (paxDropdownOpen) this.closePaxDropdown(); else this.openPaxDropdown(); },
        openPaxDropdown: function () {
            var dd = document.getElementById('tb-pax-dropdown');
            if (!dd) return;
            // Position dropdown below the active pax pill
            var mode = TB.State.get('mode');
            var pill = document.getElementById(mode === 'multi-city' ? 'tb-pax-pill-multi' : 'tb-pax-pill');
            if (pill && window.innerWidth > 768) {
                var rect = pill.getBoundingClientRect();
                var step = document.getElementById('tb-step-1');
                var stepRect = step ? step.getBoundingClientRect() : { left: 0, top: 0 };
                dd.style.position = 'absolute';
                dd.style.top = (rect.bottom - stepRect.top + 8) + 'px';
                dd.style.right = Math.max(0, stepRect.right - rect.right) + 'px';
                dd.style.left = 'auto';
            }
            dd.classList.add('tb-show');
            paxDropdownOpen = true;
        },
        closePaxDropdown: function () { var dd = document.getElementById('tb-pax-dropdown'); if (dd) dd.classList.remove('tb-show'); paxDropdownOpen = false; },

        updateCounter: function (target, action) {
            var el = document.getElementById(target);
            if (!el) return;
            var val = parseInt(el.textContent) || 1;
            var min = target === 'tb-pax-count' ? 1 : 0;
            var max = 20;
            if (action === 'increase') val = Math.min(val + 1, max);
            else val = Math.max(val - 1, min);
            el.textContent = val;
            if (target === 'tb-pax-count') TB.State.set('passengers', val);
            else if (target === 'tb-luggage-count') TB.State.set('luggage', val);
            this.updatePaxPillDisplay();
        },

        updatePaxPillDisplay: function () {
            var pax = TB.State.get('passengers') || 1;
            var lug = TB.State.get('luggage') || 1;
            var text = pax + ' pax, ' + lug + ' bag' + (lug !== 1 ? 's' : '');
            var pillText = document.getElementById('tb-pax-pill-text');
            if (pillText) pillText.textContent = text;
            var pillTextMulti = document.getElementById('tb-pax-pill-text-multi');
            if (pillTextMulti) pillTextMulti.textContent = text;
        },

        /* ── Autocomplete ── */
        initAutocomplete: function () {
            var self = this;
            if (window.google && google.maps && google.maps.places) {
                googleReady = true;
                this.prepareGoogleOptions();
                this.initAutocompleteForLeg(0);
            } else if (!tbConfig.googleMapsApiKey) {
                TB.API.getGoogleMapsConfig().then(function (data) {
                    if (data && data.api_key && data.enabled) self.loadGoogleMapsScript(data.api_key);
                    else self.initFallbackForLeg(0);
                }).catch(function () { self.initFallbackForLeg(0); });
            } else {
                this.loadGoogleMapsScript(tbConfig.googleMapsApiKey);
            }
        },

        loadGoogleMapsScript: function (apiKey) {
            var self = this;
            var script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=places';
            script.async = true;
            script.onload = function () {
                googleReady = true;
                self.prepareGoogleOptions();
                self.initAutocompleteForLeg(0);
            };
            script.onerror = function () { self.initFallbackForLeg(0); };
            document.head.appendChild(script);
        },

        prepareGoogleOptions: function () {
            if (!window.google) return;
            var moroccoBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(27.6, -13.2),
                new google.maps.LatLng(35.9, -1.0)
            );
            googleOptions = {
                bounds: moroccoBounds,
                componentRestrictions: { country: 'ma' },
                fields: ['formatted_address', 'geometry', 'name'],
                strictBounds: false
            };
        },

        initAutocompleteForLeg: function (legIdx) {
            if (googleReady) {
                this._setupGoogleForLeg(legIdx, 'pickup');
                this._setupGoogleForLeg(legIdx, 'dropoff');
            } else {
                this.initFallbackForLeg(legIdx);
            }
        },

        _setupGoogleForLeg: function (legIdx, field) {
            var mode = TB.State.get('mode');
            var container = (mode === 'multi-city') ? document.getElementById('tb-legs-container') : document.getElementById('tb-single-bar');
            if (!container) return;
            var input = container.querySelector('input[data-leg="' + legIdx + '"][data-field="' + field + '"]');
            if (!input) return;
            var key = legIdx + '-' + field;
            if (autocompleteInstances[key]) {
                google.maps.event.clearInstanceListeners(autocompleteInstances[key]);
                delete autocompleteInstances[key];
            }
            var ac = new google.maps.places.Autocomplete(input, googleOptions);
            autocompleteInstances[key] = ac;
            ac.addListener('place_changed', function () {
                var place = ac.getPlace();
                if (place.geometry) {
                    var addr = place.formatted_address || place.name;
                    var lat = place.geometry.location.lat();
                    var lng = place.geometry.location.lng();
                    var clearBtn = input.parentNode.querySelector('.tb-pill-bar__clear');
                    if (clearBtn) clearBtn.style.display = 'flex';
                    var legs = TB.State.get('legs') || [];
                    if (!legs[legIdx]) return;
                    if (field === 'pickup') { legs[legIdx].pickupAddress = addr; legs[legIdx].pickupLat = lat; legs[legIdx].pickupLng = lng; }
                    else { legs[legIdx].dropoffAddress = addr; legs[legIdx].dropoffLat = lat; legs[legIdx].dropoffLng = lng; }
                    legs[legIdx].transferType = inferTransferType(legs[legIdx].pickupAddress || '', legs[legIdx].dropoffAddress || '');
                    TB.State.set('legs', legs);
                    if (legIdx === 0) TB.State.syncLegToFlat(0);
                    TB.Step1.syncReturnLeg();
                    var returnLegExists = legs.length > 0 && legs[legs.length - 1].isReturnLeg;
                    if (returnLegExists) TB.Step1.renderAllLegs();
                    updateFlightBar();
                }
            });
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
        },

        destroyAutocompleteForLeg: function (legIdx) {
            var keys = [legIdx + '-pickup', legIdx + '-dropoff'];
            for (var i = 0; i < keys.length; i++) {
                if (autocompleteInstances[keys[i]]) {
                    if (window.google) google.maps.event.clearInstanceListeners(autocompleteInstances[keys[i]]);
                    delete autocompleteInstances[keys[i]];
                }
            }
        },

        initFallbackForLeg: function (legIdx) {
            this._setupFallbackField(legIdx, 'pickup');
            this._setupFallbackField(legIdx, 'dropoff');
        },

        _setupFallbackField: function (legIdx, field) {
            var mode = TB.State.get('mode');
            var container = (mode === 'multi-city') ? document.getElementById('tb-legs-container') : document.getElementById('tb-single-bar');
            if (!container) return;
            var input = container.querySelector('input[data-leg="' + legIdx + '"][data-field="' + field + '"]');
            var dropdown = container.querySelector('[data-leg="' + legIdx + '"][data-dropdown="' + field + '"]');
            if (!input || !dropdown) return;
            input.addEventListener('input', function () {
                var query = input.value.toLowerCase();
                if (query.length < 2) { dropdown.classList.remove('tb-show'); return; }
                var matches = FALLBACK_LOCATIONS.filter(function (loc) {
                    return loc.name.toLowerCase().indexOf(query) !== -1 || loc.type.toLowerCase().indexOf(query) !== -1;
                });
                if (matches.length === 0) { dropdown.classList.remove('tb-show'); return; }
                var html = '';
                for (var i = 0; i < matches.length; i++) {
                    var loc = matches[i];
                    html += '<div class="tb-autocomplete-item" data-name="' + TB.Utils.escapeHtml(loc.name) +
                        '" data-lat="' + loc.lat + '" data-lng="' + loc.lng + '">' +
                        '<span class="tb-autocomplete-item__icon">' + (loc.type.indexOf('Airport') !== -1 ? '&#9992;' : '&#9679;') + '</span>' +
                        '<div><div class="tb-autocomplete-item__name">' + TB.Utils.escapeHtml(loc.name) + '</div>' +
                        '<div class="tb-autocomplete-item__type">' + TB.Utils.escapeHtml(loc.type) + '</div></div></div>';
                }
                dropdown.innerHTML = html;
                dropdown.classList.add('tb-show');
                var items = dropdown.querySelectorAll('.tb-autocomplete-item');
                for (var j = 0; j < items.length; j++) {
                    items[j].addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        var name = this.getAttribute('data-name');
                        var lat = parseFloat(this.getAttribute('data-lat'));
                        var lng = parseFloat(this.getAttribute('data-lng'));
                        input.value = name;
                        dropdown.classList.remove('tb-show');
                        var clearBtn = input.parentNode.querySelector('.tb-pill-bar__clear');
                        if (clearBtn) clearBtn.style.display = 'flex';
                        var legs = TB.State.get('legs') || [];
                        if (!legs[legIdx]) return;
                        if (field === 'pickup') { legs[legIdx].pickupAddress = name; legs[legIdx].pickupLat = lat; legs[legIdx].pickupLng = lng; }
                        else { legs[legIdx].dropoffAddress = name; legs[legIdx].dropoffLat = lat; legs[legIdx].dropoffLng = lng; }
                        legs[legIdx].transferType = inferTransferType(legs[legIdx].pickupAddress || '', legs[legIdx].dropoffAddress || '');
                        TB.State.set('legs', legs);
                        if (legIdx === 0) TB.State.syncLegToFlat(0);
                        TB.Step1.syncReturnLeg();
                        var returnLegExists = legs.length > 0 && legs[legs.length - 1].isReturnLeg;
                        if (returnLegExists) TB.Step1.renderAllLegs();
                        updateFlightBar();
                    });
                }
            });
            input.addEventListener('blur', function () { setTimeout(function () { dropdown.classList.remove('tb-show'); }, 200); });
        },

        /* ── Restore state ── */
        restoreState: function () {
            var s = TB.State.getAll();
            var mode = s.mode || 'one-way';
            var legs = s.legs || [];
            var leg0 = legs[0] || {};
            var pickupInput = document.querySelector('#tb-single-bar input[data-field="pickup"]');
            var dropoffInput = document.querySelector('#tb-single-bar input[data-field="dropoff"]');
            var dtInput = document.querySelector('#tb-single-bar input[data-field="datetime"]');
            if (pickupInput && leg0.pickupAddress) pickupInput.value = leg0.pickupAddress;
            if (dropoffInput && leg0.dropoffAddress) dropoffInput.value = leg0.dropoffAddress;
            if (dtInput && leg0.pickupDatetime) dtInput.value = leg0.pickupDatetime;
            var returnDt = document.getElementById('tb-return-datetime');
            if (returnDt && s.returnDatetime) returnDt.value = s.returnDatetime;
            var flightInput = document.getElementById('tb-flight-number');
            if (flightInput && s.flightNumber) flightInput.value = s.flightNumber;
            var paxCount = document.getElementById('tb-pax-count');
            var lugCount = document.getElementById('tb-luggage-count');
            if (paxCount) paxCount.textContent = s.passengers || 1;
            if (lugCount) lugCount.textContent = s.luggage || 1;
            this.updatePaxPillDisplay();
            this.switchMode(mode);
            updateFlightBar();
        },

        /* ── Validation ── */
        validate: function () {
            var mode = TB.State.get('mode');
            var legs = TB.State.get('legs') || [];
            var errors = [];
            var invalids = document.querySelectorAll('.tb-pill-bar__field--invalid');
            for (var v = 0; v < invalids.length; v++) invalids[v].classList.remove('tb-pill-bar__field--invalid');

            if (mode === 'multi-city') {
                for (var i = 0; i < legs.length; i++) {
                    if (!legs[i].pickupAddress || !legs[i].pickupLat) errors.push({ leg: i, field: 'pickup', msg: tbConfig.i18n.selectPickup });
                    if (!legs[i].dropoffAddress || !legs[i].dropoffLat) errors.push({ leg: i, field: 'dropoff', msg: tbConfig.i18n.selectDropoff });
                    if (!legs[i].pickupDatetime) errors.push({ leg: i, field: 'datetime', msg: tbConfig.i18n.selectDatetime });
                }
            } else {
                var leg = legs[0] || {};
                if (!leg.pickupAddress || !leg.pickupLat) errors.push({ leg: 0, field: 'pickup', msg: tbConfig.i18n.selectPickup });
                if (!leg.dropoffAddress || !leg.dropoffLat) errors.push({ leg: 0, field: 'dropoff', msg: tbConfig.i18n.selectDropoff });
                if (!leg.pickupDatetime) errors.push({ leg: 0, field: 'datetime', msg: tbConfig.i18n.selectDatetime });
                if (mode === 'round-trip') {
                    var returnDt = TB.State.get('returnDatetime');
                    if (!returnDt) errors.push({ leg: 0, field: 'return', msg: tbConfig.i18n.returnDateRequired });
                }
            }

            for (var e = 0; e < errors.length; e++) {
                var err = errors[e];
                var container = (mode === 'multi-city')
                    ? document.querySelector('.tb-leg-row[data-leg-index="' + err.leg + '"]')
                    : document.getElementById('tb-single-bar');
                if (container) {
                    var fieldEl = container.querySelector('.tb-pill-bar__field--' + err.field);
                    if (fieldEl) fieldEl.classList.add('tb-pill-bar__field--invalid');
                }
                if (err.field === 'return') {
                    var returnField = document.getElementById('tb-return-field');
                    if (returnField) returnField.classList.add('tb-pill-bar__field--invalid');
                }
            }

            if (errors.length > 0) {
                var bar = (mode === 'multi-city') ? document.getElementById('tb-multi-bar') : document.getElementById('tb-single-bar');
                if (bar) { bar.classList.add('tb-shake'); setTimeout(function () { bar.classList.remove('tb-shake'); }, 600); }
            }
            return { valid: errors.length === 0, errors: errors };
        },

        /* ── Save state ── */
        saveState: function () {
            var mode = TB.State.get('mode');
            var legs = TB.State.get('legs') || [];
            if (mode !== 'multi-city') {
                var dtInput = document.querySelector('#tb-single-bar input[data-field="datetime"]');
                if (legs[0]) { if (dtInput) legs[0].pickupDatetime = dtInput.value; }
                TB.State.set('legs', legs);
                TB.State.syncLegToFlat(0);
            }
            TB.State.save();
        },

        /* ── Search / onNext ── */
        onNext: function () {
            this.saveState();
            var result = this.validate();
            if (!result.valid) return false;

            var mode = TB.State.get('mode');
            var legs = TB.State.get('legs') || [];
            var btn = document.getElementById(mode === 'multi-city' ? 'tb-btn-search-multi' : 'tb-btn-search');
            var container = document.getElementById('tb-no-route-container');
            TB.Utils.setButtonLoading(btn, true);
            if (container) container.style.display = 'none';

            for (var i = 0; i < legs.length; i++) {
                legs[i].transferType = inferTransferType(legs[i].pickupAddress || '', legs[i].dropoffAddress || '');
            }
            TB.State.set('legs', legs);

            if (mode === 'multi-city') {
                TB.State.set('currentLegIndex', 0);
                TB.State.syncLegToFlat(0);
            } else {
                TB.State.syncLegToFlat(0);
            }

            var state = TB.State.getAll();
            TB.API.getPricing(state.pickupLat, state.pickupLng, state.dropoffLat, state.dropoffLng, state.passengers)
                .then(function (data) {
                    TB.Utils.setButtonLoading(btn, false);
                    if (data.pricing_type === 'calculated' && tbConfig.showNoRouteMessage) {
                        TB.Step1.showNoRouteMessage(container);
                        return;
                    }
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
                    if (container) container.style.display = 'none';
                    TB.Wizard.showStep(2);
                }).catch(function () {
                    TB.Utils.setButtonLoading(btn, false);
                    if (tbConfig.showNoRouteMessage) TB.Step1.showNoRouteMessage(container);
                    else TB.Wizard.showStep(2);
                });
            return false;
        },

        showNoRouteMessage: function (container) {
            if (!container) return;
            var contact = tbConfig.contact || {};
            var message = tbConfig.noRouteMessage || '';
            var html = '<div class="tb-no-route"><div class="tb-no-route__icon">';
            html += '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
            html += '</div>';
            if (message) html += '<div class="tb-no-route__message">' + TB.Utils.escapeHtml(message) + '</div>';
            html += '<div class="tb-no-route__contacts">';
            if (contact.phone) html += '<a href="tel:' + TB.Utils.escapeHtml(contact.phone) + '" class="tb-no-route__contact-btn">' + TB.Utils.escapeHtml(contact.phone) + '</a>';
            if (contact.email) html += '<a href="mailto:' + TB.Utils.escapeHtml(contact.email) + '" class="tb-no-route__contact-btn">' + TB.Utils.escapeHtml(contact.email) + '</a>';
            if (contact.whatsapp) html += '<a href="https://wa.me/' + TB.Utils.escapeHtml(contact.whatsapp) + '" target="_blank" class="tb-no-route__contact-btn tb-no-route__contact-btn--whatsapp">WhatsApp</a>';
            html += '</div></div>';
            container.innerHTML = html;
            container.style.display = 'block';
        },

        showMinTimeMessage: function (container, minHours) {
            if (!container) return;
            var html = '<div class="tb-alert tb-alert--error" style="margin-top:1rem;"><strong>';
            html += TB.Utils.escapeHtml(
                (tbConfig.i18n.minBookingTime || 'We can only accept bookings for this route with a minimum of {hours} hours notice.')
                    .replace('{hours}', minHours)
            );
            html += '</strong></div>';
            container.innerHTML = html;
            container.style.display = 'block';
        }
    };
})();
