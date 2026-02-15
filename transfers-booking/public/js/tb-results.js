/**
 * Results page — vehicle listing, route info, extras.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n, params, routeData, selectedExtras;

    TB.Results = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};
            selectedExtras = [];

            params = this.parseParams();
            if (!params.from_lat || !params.to_lat || !params.date) {
                // Missing required params — redirect home
                window.location.href = cfg.resultsPageUrl || '/';
                return;
            }

            this.populateSearchBar();
            this.populateRouteSummary();
            this.initModifySearch();
            this.searchVehicles();
        },

        /* ── Parse URL params ─────────────────── */

        parseParams: function () {
            var sp = new URLSearchParams(window.location.search);
            return {
                from: sp.get('from') || '',
                from_lat: sp.get('from_lat') || '',
                from_lng: sp.get('from_lng') || '',
                to: sp.get('to') || '',
                to_lat: sp.get('to_lat') || '',
                to_lng: sp.get('to_lng') || '',
                date: sp.get('date') || '',
                return_date: sp.get('return_date') || '',
                passengers: parseInt(sp.get('passengers'), 10) || 2,
                luggage: parseInt(sp.get('luggage'), 10) || 2,
                adults: parseInt(sp.get('adults'), 10) || 2,
                children: parseInt(sp.get('children'), 10) || 0,
                type: sp.get('type') || 'transfer'
            };
        },

        /* ── Populate search bar ──────────────── */

        populateSearchBar: function () {
            var routeEl = document.getElementById('tb-results-route-display');
            var dateEl = document.getElementById('tb-results-date-display');
            var paxEl = document.getElementById('tb-results-pax-display');

            if (routeEl) routeEl.textContent = shortName(params.from) + ' → ' + shortName(params.to);
            if (dateEl) dateEl.textContent = formatDateTime(params.date);
            if (paxEl) paxEl.textContent = params.passengers + ' ' + (i18n.passengersLabel || 'pax');
        },

        /* ── Populate route summary ───────────── */

        populateRouteSummary: function () {
            setText('tb-results-from-name', shortName(params.from));
            setText('tb-results-to-name', shortName(params.to));
            setText('tb-results-date-meta', formatDateTime(params.date));
            setText('tb-results-pax-meta', params.passengers + ' ' + (i18n.passengersLabel || 'passengers'));
        },

        /* ── Modify search ────────────────────── */

        initModifySearch: function () {
            var modifyBtn = document.getElementById('tb-results-modify-btn');
            var editPanel = document.getElementById('tb-results-search-edit');
            var fieldsPanel = document.querySelector('.tb-results__search-fields');
            var updateBtn = document.getElementById('tb-results-update-btn');
            var cancelBtn = document.getElementById('tb-results-cancel-btn');

            if (!modifyBtn || !editPanel) return;

            modifyBtn.addEventListener('click', function () {
                // Populate edit fields
                var editFrom = document.getElementById('tb-results-edit-from');
                var editTo = document.getElementById('tb-results-edit-to');
                var editDate = document.getElementById('tb-results-edit-date');
                var editPax = document.getElementById('tb-results-edit-pax');
                var editLuggage = document.getElementById('tb-results-edit-luggage');

                if (editFrom) editFrom.value = params.from;
                if (editTo) editTo.value = params.to;
                if (editDate) editDate.value = params.date;
                if (editPax) editPax.value = params.passengers;
                if (editLuggage) editLuggage.value = params.luggage;

                document.getElementById('tb-results-edit-from-lat').value = params.from_lat;
                document.getElementById('tb-results-edit-from-lng').value = params.from_lng;
                document.getElementById('tb-results-edit-to-lat').value = params.to_lat;
                document.getElementById('tb-results-edit-to-lng').value = params.to_lng;

                fieldsPanel.style.display = 'none';
                modifyBtn.style.display = 'none';
                editPanel.style.display = 'block';

                // Init Google Places on edit fields
                initEditAutocomplete();
            });

            if (cancelBtn) {
                cancelBtn.addEventListener('click', function () {
                    editPanel.style.display = 'none';
                    fieldsPanel.style.display = 'flex';
                    modifyBtn.style.display = '';
                });
            }

            if (updateBtn) {
                updateBtn.addEventListener('click', function () {
                    var newFromLat = document.getElementById('tb-results-edit-from-lat').value;
                    var newFromLng = document.getElementById('tb-results-edit-from-lng').value;
                    var newToLat = document.getElementById('tb-results-edit-to-lat').value;
                    var newToLng = document.getElementById('tb-results-edit-to-lng').value;
                    var newDate = document.getElementById('tb-results-edit-date').value;
                    var newPax = document.getElementById('tb-results-edit-pax').value;
                    var newLuggage = document.getElementById('tb-results-edit-luggage').value;

                    if (!newFromLat || !newToLat || !newDate) return;

                    // Update params
                    params.from = document.getElementById('tb-results-edit-from').value;
                    params.from_lat = newFromLat;
                    params.from_lng = newFromLng;
                    params.to = document.getElementById('tb-results-edit-to').value;
                    params.to_lat = newToLat;
                    params.to_lng = newToLng;
                    params.date = newDate;
                    params.passengers = parseInt(newPax, 10) || 2;
                    params.luggage = parseInt(newLuggage, 10) || 2;

                    // Update URL without reload
                    var sp = new URLSearchParams();
                    sp.set('from', params.from);
                    sp.set('from_lat', params.from_lat);
                    sp.set('from_lng', params.from_lng);
                    sp.set('to', params.to);
                    sp.set('to_lat', params.to_lat);
                    sp.set('to_lng', params.to_lng);
                    sp.set('date', params.date);
                    sp.set('passengers', params.passengers);
                    sp.set('luggage', params.luggage);
                    history.replaceState(null, '', '?' + sp.toString());

                    // Close edit mode
                    editPanel.style.display = 'none';
                    document.querySelector('.tb-results__search-fields').style.display = 'flex';
                    document.getElementById('tb-results-modify-btn').style.display = '';

                    // Re-populate displays and search again
                    TB.Results.populateSearchBar();
                    TB.Results.populateRouteSummary();
                    TB.Results.searchVehicles();
                });
            }
        },

        /* ── Search vehicles ──────────────────── */

        searchVehicles: function () {
            showLoading(true);
            hideEmpty();
            clearVehicles();

            // Parallel calls: pricing + extras
            var pricingPromise = TB.API._call('search_transfers', {
                origin_lat: params.from_lat,
                origin_lng: params.from_lng,
                destination_lat: params.to_lat,
                destination_lng: params.to_lng,
                passengers: params.passengers,
                origin_name: params.from,
                destination_name: params.to
            });

            var extrasPromise = TB.API._call('get_extras', {});

            Promise.all([pricingPromise, extrasPromise]).then(function (results) {
                var data = results[0];
                var extras = results[1];

                routeData = data;
                showLoading(false);

                // Populate route summary with API data
                setText('tb-results-distance', (data.distance_km || '--') + ' km');
                var durationMin = data.estimated_duration_minutes;
                if (durationMin) {
                    var h = Math.floor(durationMin / 60);
                    var m = durationMin % 60;
                    var durStr = h > 0 ? h + 'h ' + m + 'min' : m + ' min';
                    setText('tb-results-duration', durStr);
                }

                TB.Results.renderRouteInfo(data);
                TB.Results.renderVehicles(data.vehicle_options || []);
                TB.Results.renderExtras(Array.isArray(extras) ? extras : (extras && extras.results ? extras.results : []));
            }).catch(function (err) {
                showLoading(false);
                showEmpty(err.message || i18n.errorGeneric || 'Something went wrong.');
            });
        },

        /* ── Render route info ────────────────── */

        renderRouteInfo: function (route) {
            var ci = route.custom_info || {};

            // Client notice
            if (ci.client_notice) {
                var noticeEl = document.getElementById('tb-results-notice');
                var noticeType = ci.client_notice_type || 'info';
                noticeEl.className = 'tb-results__notice tb-results__notice--' + noticeType;
                noticeEl.textContent = ci.client_notice;
                noticeEl.style.display = 'block';
            }

            // Route info section
            var hasInfo = ci.route_description || ci.highlights || ci.included_amenities || ci.travel_tips;
            if (route.description || hasInfo) {
                var infoEl = document.getElementById('tb-results-route-info');
                infoEl.style.display = 'block';

                // Description
                var descText = ci.route_description || route.description || '';
                if (descText) {
                    document.getElementById('tb-results-description').textContent = descText;
                }

                // Highlights as pills
                var highlights = ci.highlights;
                if (highlights && highlights.length) {
                    var hlEl = document.getElementById('tb-results-highlights');
                    hlEl.innerHTML = '';
                    for (var i = 0; i < highlights.length; i++) {
                        var pill = document.createElement('span');
                        pill.className = 'tb-results__highlight-pill';
                        pill.textContent = highlights[i];
                        hlEl.appendChild(pill);
                    }
                }

                // Amenities
                var amenities = ci.included_amenities;
                if (amenities && amenities.length) {
                    var amEl = document.getElementById('tb-results-amenities');
                    amEl.innerHTML = '';
                    var ul = document.createElement('ul');
                    ul.className = 'tb-results__amenity-list';
                    for (var a = 0; a < amenities.length; a++) {
                        var li = document.createElement('li');
                        li.className = 'tb-results__amenity-item';
                        li.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + escapeHtml(amenities[a]);
                        ul.appendChild(li);
                    }
                    amEl.appendChild(ul);
                }

                // Travel tips
                if (ci.travel_tips) {
                    var tipsEl = document.getElementById('tb-results-tips');
                    document.getElementById('tb-results-tips-text').textContent = ci.travel_tips;
                    tipsEl.style.display = 'flex';
                }

                // Traffic info
                if (ci.traffic_info) {
                    var trafficEl = document.getElementById('tb-results-traffic');
                    trafficEl.textContent = ci.traffic_info;
                    trafficEl.style.display = 'block';
                }
            }

            // Pickup zone info
            var pickupZone = route.matched_pickup_zone;
            if (pickupZone) {
                var pzCi = pickupZone.custom_info || {};
                if (pzCi.zone_notice || pzCi.pickup_instructions) {
                    var pzEl = document.getElementById('tb-results-pickup-info');
                    pzEl.style.display = 'block';
                    if (pzCi.zone_notice) {
                        document.getElementById('tb-results-pickup-notice').textContent = pzCi.zone_notice;
                    }
                    if (pzCi.pickup_instructions) {
                        document.getElementById('tb-results-pickup-instructions').textContent = pzCi.pickup_instructions;
                    }
                }
            }
        },

        /* ── Render vehicles ──────────────────── */

        renderVehicles: function (vehicles) {
            var container = document.getElementById('tb-results-vehicles');
            var template = document.getElementById('tb-results-vehicle-template');
            if (!container || !template) return;

            container.innerHTML = '';

            if (!vehicles || vehicles.length === 0) {
                showEmpty(i18n.noVehicles || 'No vehicles available for this route.');
                return;
            }

            // Sort by price
            vehicles.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });

            var currency = cfg.currencySymbol || 'MAD';
            var depositPct = routeData ? (routeData.deposit_percentage || 0) : 0;

            for (var i = 0; i < vehicles.length; i++) {
                var v = vehicles[i];
                var clone = template.content.cloneNode(true);
                var card = clone.querySelector('.tb-results__vehicle-card');

                card.setAttribute('data-vehicle-id', v.vehicle_id || v.category_id);

                // Image
                var img = clone.querySelector('.tb-results__vehicle-img');
                if (v.image) {
                    img.src = v.image;
                    img.alt = v.category_name || '';
                } else if (v.category_image) {
                    img.src = v.category_image;
                    img.alt = v.category_name || '';
                } else {
                    img.style.display = 'none';
                }

                // Popular badge (show for cheapest or specific flag)
                if (i === 0) {
                    var popular = clone.querySelector('.tb-results__vehicle-popular');
                    if (popular) popular.style.display = 'inline-block';
                }

                // Category name
                setText(clone, '.tb-results__vehicle-category', v.category_name || '');

                // Tagline from vehicle custom_info or category_description
                var vci = v.custom_info || {};
                var tagline = vci.tagline || v.category_description || '';
                if (tagline) {
                    setText(clone, '.tb-results__vehicle-tagline', tagline);
                } else {
                    var taglineEl = clone.querySelector('.tb-results__vehicle-tagline');
                    if (taglineEl) taglineEl.style.display = 'none';
                }

                // Vehicle name
                var vName = v.vehicle_name || '';
                if (vName && vName !== v.category_name) {
                    setText(clone, '.tb-results__vehicle-name', vName + ' ' + (i18n.orSimilar || 'or similar'));
                } else {
                    var nameEl = clone.querySelector('.tb-results__vehicle-name');
                    if (nameEl) nameEl.style.display = 'none';
                }

                // Specs
                setText(clone, '.tb-results__spec-pax', (v.passengers || '--') + ' ' + (i18n.passengersLabel || 'passengers'));
                setText(clone, '.tb-results__spec-luggage', (v.luggage || '--') + ' ' + (i18n.bagsLabel || 'bags'));

                // Features pills
                var featuresEl = clone.querySelector('.tb-results__vehicle-features');
                var features = v.features || [];
                if (features.length > 0 && featuresEl) {
                    for (var f = 0; f < features.length; f++) {
                        var pill = document.createElement('span');
                        pill.className = 'tb-results__feature-pill';
                        pill.textContent = features[f];
                        featuresEl.appendChild(pill);
                    }
                }

                // Key features
                var keyFeatures = vci.key_features;
                if (keyFeatures && keyFeatures.length) {
                    setText(clone, '.tb-results__vehicle-key-features', keyFeatures.join(' \u2022 '));
                } else {
                    var kfEl = clone.querySelector('.tb-results__vehicle-key-features');
                    if (kfEl) kfEl.style.display = 'none';
                }

                // Client description
                var clientDesc = vci.client_description || '';
                if (clientDesc) {
                    setText(clone, '.tb-results__vehicle-description', clientDesc);
                } else {
                    var descEl = clone.querySelector('.tb-results__vehicle-description');
                    if (descEl) descEl.style.display = 'none';
                }

                // Important note
                var impNote = vci.important_note;
                if (impNote) {
                    var noteEl = clone.querySelector('.tb-results__vehicle-note');
                    var noteType = vci.important_note_type || 'info';
                    noteEl.className = 'tb-results__vehicle-note tb-results__vehicle-note--' + noteType;
                    noteEl.textContent = impNote;
                    noteEl.style.display = 'block';
                }

                // Price
                var price = Math.round(v.price || 0);
                setText(clone, '.tb-results__price-value', price);
                setText(clone, '.tb-results__price-currency', currency);

                // Deposit
                if (depositPct > 0) {
                    var depositAmount = Math.round(price * depositPct / 100);
                    setText(clone, '.tb-results__price-deposit', (i18n.deposit || 'Deposit') + ': ' + depositAmount + ' ' + currency);
                } else {
                    var depEl = clone.querySelector('.tb-results__price-deposit');
                    if (depEl) depEl.style.display = 'none';
                }

                // Book button
                var bookBtn = clone.querySelector('.tb-results__book-btn');
                if (bookBtn) {
                    bookBtn.addEventListener('click', (function (vehicle) {
                        return function () {
                            TB.Results.handleBookClick(vehicle);
                        };
                    })(v));
                }

                container.appendChild(clone);
            }
        },

        /* ── Render extras ────────────────────── */

        renderExtras: function (extras) {
            if (!extras || extras.length === 0) return;

            var section = document.getElementById('tb-results-extras');
            var grid = document.getElementById('tb-results-extras-grid');
            if (!section || !grid) return;

            section.style.display = 'block';
            grid.innerHTML = '';

            for (var i = 0; i < extras.length; i++) {
                var extra = extras[i];
                var card = document.createElement('div');
                card.className = 'tb-results__extra-card';
                card.setAttribute('data-extra-id', extra.id);

                var currency = cfg.currencySymbol || 'MAD';
                var priceLabel = extra.price + ' ' + currency;
                if (extra.is_per_item) {
                    priceLabel += ' ' + (i18n.perItem || '/each');
                }

                card.innerHTML =
                    '<div class="tb-results__extra-checkbox"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
                    '<div class="tb-results__extra-info">' +
                        '<div class="tb-results__extra-name">' + escapeHtml(extra.name) + '</div>' +
                        '<div class="tb-results__extra-description">' + escapeHtml(extra.description || '') + '</div>' +
                        '<div class="tb-results__extra-price">' + escapeHtml(priceLabel) + '</div>' +
                    '</div>';

                card.addEventListener('click', (function (e, el) {
                    return function () {
                        el.classList.toggle('tb-results__extra-card--selected');
                        var id = el.getAttribute('data-extra-id');
                        var idx = selectedExtras.indexOf(id);
                        if (idx > -1) {
                            selectedExtras.splice(idx, 1);
                        } else {
                            selectedExtras.push(id);
                        }
                    };
                })(extra, card));

                grid.appendChild(card);
            }
        },

        /* ── Book click ───────────────────────── */

        handleBookClick: function (vehicle) {
            var checkoutUrl = cfg.checkoutPageUrl || '/checkout/';
            var currency = cfg.currencySymbol || 'MAD';
            var depositPct = routeData ? (routeData.deposit_percentage || 0) : 0;

            var sp = new URLSearchParams();
            sp.set('from', params.from);
            sp.set('from_lat', params.from_lat);
            sp.set('from_lng', params.from_lng);
            sp.set('to', params.to);
            sp.set('to_lat', params.to_lat);
            sp.set('to_lng', params.to_lng);
            sp.set('date', params.date);
            sp.set('passengers', params.passengers);
            sp.set('luggage', params.luggage);
            sp.set('adults', params.adults);
            sp.set('children', params.children);
            sp.set('vehicle_id', vehicle.vehicle_id || '');
            sp.set('category_id', vehicle.category_id || '');
            sp.set('price', vehicle.price || 0);
            sp.set('currency', currency);
            sp.set('deposit_percentage', depositPct);

            if (params.return_date) {
                sp.set('return_date', params.return_date);
            }

            if (selectedExtras.length > 0) {
                sp.set('extras', JSON.stringify(selectedExtras));
            }

            if (routeData && routeData.id) {
                sp.set('route_id', routeData.id);
            }

            window.location.href = checkoutUrl + '?' + sp.toString();
        }
    };

    /* ── Helpers ──────────────────────────────── */

    function setText(elOrParent, selectorOrText, text) {
        if (typeof selectorOrText === 'string' && text !== undefined) {
            // elOrParent is a container, selectorOrText is a CSS selector
            var el = (elOrParent.querySelector) ? elOrParent.querySelector(selectorOrText) : document.querySelector(selectorOrText);
            if (el) el.textContent = text;
        } else {
            // elOrParent is an ID string
            var el2 = document.getElementById(elOrParent);
            if (el2) el2.textContent = selectorOrText;
        }
    }

    function shortName(name) {
        if (!name) return '--';
        var parts = name.split(',');
        return parts[0].trim();
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '--';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        }) + ' ' + d.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function showLoading(show) {
        var el = document.getElementById('tb-results-loading');
        if (el) el.style.display = show ? 'block' : 'none';
    }

    function showEmpty(msg) {
        var el = document.getElementById('tb-results-empty');
        if (el) {
            el.style.display = 'block';
            if (msg) {
                var msgEl = el.querySelector('.tb-results__empty-message');
                if (msgEl) msgEl.textContent = msg;
            }
        }
    }

    function hideEmpty() {
        var el = document.getElementById('tb-results-empty');
        if (el) el.style.display = 'none';
    }

    function clearVehicles() {
        var container = document.getElementById('tb-results-vehicles');
        if (container) container.innerHTML = '';
    }

    function initEditAutocomplete() {
        if (!window.google || !window.google.maps || !window.google.maps.places) return;

        var lang = (typeof tbConfig !== 'undefined' && tbConfig.lang) ? tbConfig.lang : 'en';

        var fields = [
            { input: 'tb-results-edit-from', lat: 'tb-results-edit-from-lat', lng: 'tb-results-edit-from-lng' },
            { input: 'tb-results-edit-to', lat: 'tb-results-edit-to-lat', lng: 'tb-results-edit-to-lng' }
        ];

        for (var i = 0; i < fields.length; i++) {
            (function (f) {
                var inputEl = document.getElementById(f.input);
                if (!inputEl || inputEl._autocompleteInit) return;
                inputEl._autocompleteInit = true;

                var ac = new google.maps.places.Autocomplete(inputEl, {
                    componentRestrictions: { country: 'ma' },
                    language: lang,
                    fields: ['formatted_address', 'geometry', 'name']
                });

                ac.addListener('place_changed', function () {
                    var place = ac.getPlace();
                    if (place && place.geometry) {
                        document.getElementById(f.lat).value = place.geometry.location.lat();
                        document.getElementById(f.lng).value = place.geometry.location.lng();
                    }
                });
            })(fields[i]);
        }
    }

    /* ── Boot ─────────────────────────────────── */

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('tb-results')) {
            TB.Results.init();
        }
    });

})();
