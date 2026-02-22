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

                // No-route handling: show contact message instead of calculated prices
                if (data.pricing_type === 'calculated' && cfg.showNoRouteMessage) {
                    showNoRouteContact();
                    return;
                }

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
                if (cfg.showNoRouteMessage) {
                    showNoRouteContact();
                } else {
                    showEmpty(err.message || i18n.errorGeneric || 'Something went wrong.');
                }
            });
        },

        /* ── Render route info ────────────────── */

        renderRouteInfo: function (route) {
            var ci = route.custom_info || {};

            // Client notice — explicit field first, fallback to custom_info
            var clientNotice = route.client_notice || ci.client_notice || '';
            var clientNoticeType = route.client_notice_type || ci.client_notice_type || 'info';
            if (clientNotice) {
                var noticeEl = document.getElementById('tb-results-notice');
                noticeEl.className = 'tb-results__notice tb-results__notice--' + clientNoticeType;
                noticeEl.textContent = clientNotice;
                noticeEl.style.display = 'block';
            }

            // Route info section — explicit fields first, fallback to custom_info
            var routeDesc = route.route_description || ci.route_description || '';
            var highlights = (route.highlights && route.highlights.length) ? route.highlights : ci.highlights;
            var amenities = (route.included_amenities && route.included_amenities.length) ? route.included_amenities : ci.included_amenities;
            var travelTips = route.travel_tips || ci.travel_tips || '';
            var trafficInfo = route.estimated_traffic_info || ci.traffic_info || ci.estimated_traffic_info || '';

            var hasInfo = routeDesc || highlights || amenities || travelTips;
            if (route.description || hasInfo) {
                var infoEl = document.getElementById('tb-results-route-info');
                infoEl.style.display = 'block';

                // Description
                var descText = routeDesc || route.description || '';
                if (descText) {
                    document.getElementById('tb-results-description').textContent = descText;
                }

                // Highlights as pills
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
                if (travelTips) {
                    var tipsEl = document.getElementById('tb-results-tips');
                    document.getElementById('tb-results-tips-text').textContent = travelTips;
                    tipsEl.style.display = 'flex';
                }

                // Traffic info
                if (trafficInfo) {
                    var trafficEl = document.getElementById('tb-results-traffic');
                    trafficEl.textContent = trafficInfo;
                    trafficEl.style.display = 'block';
                }
            }

            // Pickup zone info — explicit fields first, fallback to custom_info
            var pickupZone = route.matched_pickup_zone;
            if (pickupZone) {
                var pzCi = pickupZone.custom_info || {};
                var zoneNotice = pickupZone.client_notice || pzCi.zone_notice || pzCi.client_notice || '';
                var pickupInstr = pickupZone.pickup_instructions || pzCi.pickup_instructions || '';
                if (zoneNotice || pickupInstr) {
                    var pzEl = document.getElementById('tb-results-pickup-info');
                    pzEl.style.display = 'block';
                    if (zoneNotice) {
                        document.getElementById('tb-results-pickup-notice').textContent = zoneNotice;
                    }
                    if (pickupInstr) {
                        document.getElementById('tb-results-pickup-instructions').textContent = pickupInstr;
                    }
                }
            }
        },

        /* ── Render vehicles ──────────────────── */

        renderVehicles: function (vehicles) {
            var container = document.getElementById('tb-results-vehicles');
            if (!container) return;

            container.innerHTML = '';

            if (!vehicles || vehicles.length === 0) {
                showEmpty(i18n.noVehicles || 'No vehicles available for this route.');
                return;
            }

            // Sort by price
            vehicles.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });

            var currency = cfg.currencySymbol || 'MAD';
            var depositPct = routeData ? (routeData.deposit_percentage || 0) : 0;
            var html = '';

            for (var i = 0; i < vehicles.length; i++) {
                var v = vehicles[i];
                var vci = v.custom_info || {};
                var price = Math.round(v.price || 0);

                html += '<div class="tb-results__vehicle-card" data-vehicle-id="' + (v.vehicle_id || v.category_id) + '" data-category-id="' + (v.category_id || '') + '">';
                html += '<h3 class="tb-results__vehicle-card__header">' + escapeHtml(v.category_name || '') + '</h3>';

                // Tagline
                var tagline = v.category_tagline || vci.tagline || v.category_description || '';
                if (tagline) {
                    html += '<div class="tb-results__vehicle-card__tagline">' + escapeHtml(tagline) + '</div>';
                }

                html += '<div class="tb-results__vehicle-card__body">';
                // Image
                html += '<div class="tb-results__vehicle-card__image">';
                if (v.image || v.category_image) {
                    html += '<img src="' + escapeHtml(v.image || v.category_image) + '" alt="' + escapeHtml(v.category_name || '') + '">';
                } else {
                    html += '<span class="tb-results__vehicle-card__image-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M5 17H3v-6l2-5h9l4 5h3v6h-2"/><path d="M5 17h6m4 0h2"/></svg></span>';
                }
                html += '</div>';
                // Details
                html += '<div class="tb-results__vehicle-card__details">';
                html += '<div class="tb-results__vehicle-card__specs">';
                html += '<span class="tb-results__vehicle-card__spec"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1.5C5.33 9.5 2 10.83 2 12.5V14h12v-1.5c0-1.67-3.33-3-6-3z" fill="currentColor"/></svg> ' + (v.passengers || '--') + '</span>';
                html += '<span class="tb-results__vehicle-card__spec"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5.5 4V2.5A1 1 0 016.5 1.5h3a1 1 0 011 1V4M2 5h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg> ' + (v.luggage || '--') + '</span>';
                html += '</div>';
                // Features
                var features = v.features || [];
                if (features.length > 0) {
                    html += '<div class="tb-results__vehicle-card__features">';
                    for (var f = 0; f < features.length; f++) {
                        var feat = features[f];
                        var isTime = feat.toLowerCase().indexOf('waiting') !== -1 || feat.toLowerCase().indexOf('minute') !== -1;
                        var cls = isTime ? 'tb-results__vehicle-card__feature--time' : 'tb-results__vehicle-card__feature--ok';
                        var icon = isTime
                            ? '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
                            : '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                        html += '<div class="tb-results__vehicle-card__feature ' + cls + '">' + icon + ' ' + escapeHtml(feat) + '</div>';
                    }
                    html += '</div>';
                }
                // Key features
                var keyFeatures = (v.key_features && v.key_features.length) ? v.key_features : vci.key_features;
                if (keyFeatures && keyFeatures.length) {
                    html += '<div class="tb-results__vehicle-card__key-features">' + escapeHtml(keyFeatures.join(' \u2022 ')) + '</div>';
                }
                // Client description
                var clientDesc = v.client_description || vci.client_description || '';
                if (clientDesc) {
                    html += '<div class="tb-results__vehicle-card__description">' + escapeHtml(clientDesc) + '</div>';
                }
                // Models
                var vName = v.vehicle_name || '';
                if (vName && vName !== v.category_name) {
                    html += '<p class="tb-results__vehicle-card__models">' + escapeHtml(vName) + ' ' + (i18n.orSimilar || 'or similar') + '</p>';
                }
                // Important note
                var impNote = v.important_note || vci.important_note || '';
                if (impNote) {
                    var noteType = v.important_note_type || vci.important_note_type || 'info';
                    html += '<div class="tb-results__vehicle-card__note tb-results__vehicle-card__note--' + noteType + '" style="display:block">' + escapeHtml(impNote) + '</div>';
                }
                html += '</div>';
                // Pricing
                html += '<div class="tb-results__vehicle-card__pricing">';
                html += '<div><span class="tb-results__vehicle-card__price-amount">' + price + '</span> <span class="tb-results__vehicle-card__price-currency">' + escapeHtml(currency) + '</span></div>';
                if (depositPct > 0) {
                    var depositAmount = Math.round(price * depositPct / 100);
                    html += '<div class="tb-results__vehicle-card__deposit">' + (i18n.deposit || 'Deposit') + ': ' + depositAmount + ' ' + currency + '</div>';
                }
                html += '<div class="tb-results__vehicle-card__payment-icons">';
                html += '<span class="tb-results__vehicle-card__payment-icon"><svg viewBox="0 0 24 16"><rect width="24" height="16" rx="2" fill="#1A1F71"/><text x="12" y="11" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold" font-family="sans-serif">VISA</text></svg></span>';
                html += '<span class="tb-results__vehicle-card__payment-icon"><svg viewBox="0 0 24 16"><rect width="24" height="16" rx="2" fill="#f5f5f5"/><circle cx="9" cy="8" r="5" fill="#EB001B" opacity="0.8"/><circle cx="15" cy="8" r="5" fill="#F79E1B" opacity="0.8"/></svg></span>';
                html += '</div>';
                html += '<button type="button" class="tb-results__vehicle-card__book-btn" data-idx="' + i + '">' + (i18n.bookNow || 'Book Now') + '</button>';
                html += '</div></div></div>';
            }

            container.innerHTML = html;

            // Bind book button clicks
            var bookBtns = container.querySelectorAll('.tb-results__vehicle-card__book-btn');
            for (var b = 0; b < bookBtns.length; b++) {
                bookBtns[b].addEventListener('click', (function (vehicle) {
                    return function (e) {
                        e.stopPropagation();
                        TB.Results.handleBookClick(vehicle);
                    };
                })(vehicles[parseInt(bookBtns[b].getAttribute('data-idx'))]);
            }
        },

        /* ── Render extras ────────────────────── */

        renderExtras: function (extras) {
            if (!extras || extras.length === 0) return;

            var section = document.getElementById('tb-results-extras');
            var grid = document.getElementById('tb-results-extras-grid');
            if (!section || !grid) return;

            section.style.display = 'block';
            var html = '';
            var currency = cfg.currencySymbol || 'MAD';

            for (var i = 0; i < extras.length; i++) {
                var extra = extras[i];
                var priceLabel = extra.price + ' ' + currency;
                if (extra.is_per_item) {
                    priceLabel += ' ' + (i18n.perItem || '/each');
                }

                html += '<div class="tb-service-row" data-extra-id="' + extra.id + '">';
                html += '<div class="tb-service-row__info">';
                html += '<div class="tb-service-row__name">' + escapeHtml(extra.name) + '</div>';
                html += '<div class="tb-service-row__price">' + escapeHtml(priceLabel) + '</div>';
                if (extra.description) {
                    html += '<div class="tb-service-row__desc">' + escapeHtml(extra.description) + '</div>';
                }
                html += '</div>';
                html += '<label class="tb-toggle"><input type="checkbox" data-extra-id="' + extra.id + '">';
                html += '<span class="tb-toggle__slider"></span></label>';
                html += '</div>';
            }

            grid.innerHTML = html;

            // Bind toggle change
            var toggles = grid.querySelectorAll('.tb-toggle input');
            for (var j = 0; j < toggles.length; j++) {
                toggles[j].addEventListener('change', function () {
                    var id = this.getAttribute('data-extra-id');
                    var idx = selectedExtras.indexOf(id);
                    if (idx > -1) {
                        selectedExtras.splice(idx, 1);
                    } else {
                        selectedExtras.push(id);
                    }
                });
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

            // Propagate lang param through the flow
            var lang = (new URLSearchParams(window.location.search)).get('lang') || '';
            if (lang) {
                sp.set('lang', lang);
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

    function showNoRouteContact() {
        var contact = cfg.contact || {};
        var message = cfg.noRouteMessage || '';
        var container = document.getElementById('tb-results-vehicles');
        if (!container) return;

        var html = '<div class="tb-no-route">';
        html += '<div class="tb-no-route__icon">';
        html += '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        html += '</div>';
        if (message) {
            html += '<div class="tb-no-route__message">' + escapeHtml(message) + '</div>';
        }
        html += '<div class="tb-no-route__contacts">';
        if (contact.phone) {
            html += '<a href="tel:' + escapeHtml(contact.phone) + '" class="tb-no-route__contact-btn tb-no-route__contact-btn--phone">';
            html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
            html += ' ' + escapeHtml(contact.phone);
            html += '</a>';
        }
        if (contact.email) {
            html += '<a href="mailto:' + escapeHtml(contact.email) + '" class="tb-no-route__contact-btn tb-no-route__contact-btn--email">';
            html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
            html += ' ' + escapeHtml(contact.email);
            html += '</a>';
        }
        if (contact.whatsapp) {
            html += '<a href="https://wa.me/' + escapeHtml(contact.whatsapp) + '" target="_blank" rel="noopener" class="tb-no-route__contact-btn tb-no-route__contact-btn--whatsapp">';
            html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
            html += ' WhatsApp';
            html += '</a>';
        }
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
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
