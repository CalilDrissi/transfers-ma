/**
 * Step 2: Vehicle selection and extras.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    TB.Step2 = {

        init: function () {
            this.loadVehicles();
            this.updateSidebar();
            this.bindEvents();
        },

        bindEvents: function () {
            var self = this;

            // Continue button
            var btn = document.getElementById('tb-btn-continue');
            if (btn) {
                btn.addEventListener('click', function () {
                    self.onNext();
                });
            }

            // Back button
            var backBtns = document.querySelectorAll('#tb-step-2 .tb-btn-back');
            for (var i = 0; i < backBtns.length; i++) {
                backBtns[i].addEventListener('click', function () {
                    TB.Wizard.showStep(1);
                });
            }
        },

        loadVehicles: function () {
            var container = document.getElementById('tb-vehicles-container');
            container.innerHTML = '<div class="tb-loading"><span class="tb-spinner"></span> ' + tbConfig.i18n.loading + '</div>';

            var state = TB.State.getAll();

            TB.API.getPricing(
                state.pickupLat,
                state.pickupLng,
                state.dropoffLat,
                state.dropoffLng,
                state.passengers
            ).then(function (data) {
                // No-route handling: show contact message instead of calculated prices
                if (data.pricing_type === 'calculated' && tbConfig.showNoRouteMessage) {
                    TB.Step2.renderNoRouteMessage();
                    return;
                }
                TB.State.set('pricingData', data);
                TB.State.set('vehicleOptions', data.vehicle_options || []);
                TB.Step2.renderVehicles(data);
                TB.Step2.renderRouteInfo(data);
            }).catch(function (err) {
                if (tbConfig.showNoRouteMessage) {
                    TB.Step2.renderNoRouteMessage();
                } else {
                    container.innerHTML = '<div class="tb-alert tb-alert--error">' +
                        TB.Utils.escapeHtml(err.message || tbConfig.i18n.errorGeneric) + '</div>';
                }
            });
        },

        renderNoRouteMessage: function () {
            var container = document.getElementById('tb-vehicles-container');
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

            // Disable continue button
            var btn = document.getElementById('tb-btn-continue');
            if (btn) btn.disabled = true;
        },

        renderRouteInfo: function (data) {
            var pickup = document.getElementById('tb-result-pickup');
            var dropoff = document.getElementById('tb-result-dropoff');
            var distance = document.getElementById('tb-result-distance');
            var duration = document.getElementById('tb-result-duration');

            if (pickup) pickup.textContent = TB.Utils.shortName(TB.State.get('pickupAddress'));
            if (dropoff) dropoff.textContent = TB.Utils.shortName(TB.State.get('dropoffAddress'));
            if (distance) distance.textContent = (data.distance_km || '--') + ' km';
            if (duration) duration.textContent = TB.Utils.formatDuration(data.estimated_duration_minutes);

            // Route/Zone notice
            var noticeEl = document.getElementById('tb-route-notice');
            if (noticeEl) {
                var noticeHtml = '';
                if (data.client_notice) {
                    var nType = data.client_notice_type || 'info';
                    noticeHtml += '<div class="tb-notice tb-notice--' + TB.Utils.escapeHtml(nType) + '">';
                    noticeHtml += '<span class="tb-notice__icon">' + TB.Step2._noticeIcon(nType) + '</span> ';
                    noticeHtml += TB.Utils.escapeHtml(data.client_notice);
                    noticeHtml += '</div>';
                }
                if (data.area_description) {
                    noticeHtml += '<p class="tb-route-area-desc">' + TB.Utils.escapeHtml(data.area_description) + '</p>';
                }
                noticeEl.innerHTML = noticeHtml;
            }

            // Route details: highlights, tips, amenities, traffic
            var detailsEl = document.getElementById('tb-route-details');
            if (detailsEl) {
                var dHtml = '';
                // Highlights
                var highlights = data.highlights;
                if (highlights && highlights.length > 0) {
                    dHtml += '<ul class="tb-route-highlights">';
                    for (var h = 0; h < highlights.length; h++) {
                        dHtml += '<li><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + TB.Utils.escapeHtml(highlights[h]) + '</li>';
                    }
                    dHtml += '</ul>';
                }
                // Travel tips
                if (data.travel_tips) {
                    dHtml += '<div class="tb-route-tips">';
                    dHtml += '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> ';
                    dHtml += TB.Utils.escapeHtml(data.travel_tips);
                    dHtml += '</div>';
                }
                // Included amenities
                var amenities = data.included_amenities;
                if (amenities && amenities.length > 0) {
                    dHtml += '<div class="tb-route-amenities">';
                    for (var a = 0; a < amenities.length; a++) {
                        dHtml += '<span class="tb-route-amenity">' + TB.Utils.escapeHtml(amenities[a]) + '</span>';
                    }
                    dHtml += '</div>';
                }
                // Traffic info
                if (data.estimated_traffic_info) {
                    dHtml += '<p class="tb-route-traffic">' + TB.Utils.escapeHtml(data.estimated_traffic_info) + '</p>';
                }
                detailsEl.innerHTML = dHtml;
            }
        },

        _noticeIcon: function (type) {
            if (type === 'warning') return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L1 14h14L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v4M8 12h.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
            if (type === 'success') return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
        },

        renderVehicles: function (data) {
            var container = document.getElementById('tb-vehicles-container');
            var options = data.vehicle_options || [];

            if (options.length === 0) {
                container.innerHTML = '<div class="tb-loading">' + tbConfig.i18n.noVehicles + '</div>';
                return;
            }

            var currency = tbConfig.currencySymbol || 'MAD';
            var html = '';
            for (var i = 0; i < options.length; i++) {
                var v = options[i];
                var price = Math.round(v.price || 0);
                html += '<div class="tb-vehicle-card" data-category-id="' + v.category_id + '">';
                html += '<h3 class="tb-vehicle-card__header">' + TB.Utils.escapeHtml(v.category_name || v.vehicle_name) + '</h3>';
                html += '<div class="tb-vehicle-card__body">';
                // Image
                html += '<div class="tb-vehicle-card__image">';
                if (v.category_image || v.image) {
                    html += '<img src="' + TB.Utils.escapeHtml(v.category_image || v.image) + '" alt="' + TB.Utils.escapeHtml(v.category_name || '') + '">';
                } else {
                    html += '<span class="tb-vehicle-card__image-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M5 17H3v-6l2-5h9l4 5h3v6h-2"/><path d="M5 17h6m4 0h2"/></svg></span>';
                }
                html += '</div>';
                // Details
                html += '<div class="tb-vehicle-card__details">';
                html += '<div class="tb-vehicle-card__specs">';
                html += '<span class="tb-vehicle-card__spec"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1.5C5.33 9.5 2 10.83 2 12.5V14h12v-1.5c0-1.67-3.33-3-6-3z" fill="currentColor"/></svg> ' + (v.passengers || '--') + '</span>';
                html += '<span class="tb-vehicle-card__spec"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5.5 4V2.5A1 1 0 016.5 1.5h3a1 1 0 011 1V4M2 5h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg> ' + (v.luggage || '--') + '</span>';
                html += '</div>';
                // Features
                if (v.features && v.features.length > 0) {
                    html += '<div class="tb-vehicle-card__features">';
                    for (var j = 0; j < v.features.length; j++) {
                        var feat = v.features[j];
                        var isTime = feat.toLowerCase().indexOf('waiting') !== -1 || feat.toLowerCase().indexOf('minute') !== -1;
                        var cls = isTime ? 'tb-vehicle-card__feature--time' : 'tb-vehicle-card__feature--ok';
                        var icon = isTime
                            ? '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
                            : '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                        html += '<div class="tb-vehicle-card__feature ' + cls + '">' + icon + ' ' + TB.Utils.escapeHtml(feat) + '</div>';
                    }
                    html += '</div>';
                }
                // Models
                if (v.vehicle_name && v.vehicle_name !== v.category_name) {
                    html += '<p class="tb-vehicle-card__models">' + TB.Utils.escapeHtml(v.vehicle_name) + '</p>';
                }
                html += '</div>';
                // Important note
                if (v.important_note) {
                    var noteType = v.important_note_type || 'info';
                    html += '<div class="tb-vehicle-card__notice tb-vehicle-card__notice--' + TB.Utils.escapeHtml(noteType) + '">';
                    html += TB.Step2._noticeIcon(noteType) + ' ' + TB.Utils.escapeHtml(v.important_note);
                    html += '</div>';
                }
                // Pricing
                html += '<div class="tb-vehicle-card__pricing">';
                html += '<div><span class="tb-vehicle-card__price-amount">' + price + '</span> <span class="tb-vehicle-card__price-currency">' + TB.Utils.escapeHtml(currency) + '</span></div>';
                html += '<div class="tb-vehicle-card__payment-icons">';
                html += '<span class="tb-vehicle-card__payment-icon"><svg viewBox="0 0 24 16"><rect width="24" height="16" rx="2" fill="#1A1F71"/><text x="12" y="11" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold" font-family="sans-serif">VISA</text></svg></span>';
                html += '<span class="tb-vehicle-card__payment-icon"><svg viewBox="0 0 24 16"><rect width="24" height="16" rx="2" fill="#f5f5f5"/><circle cx="9" cy="8" r="5" fill="#EB001B" opacity="0.8"/><circle cx="15" cy="8" r="5" fill="#F79E1B" opacity="0.8"/></svg></span>';
                html += '</div>';
                html += '<button type="button" class="tb-vehicle-card__select-btn">' + (tbConfig.i18n.search || 'Select') + '</button>';
                html += '</div></div></div>';
            }
            container.innerHTML = html;

            // Bind card clicks
            var cards = container.querySelectorAll('.tb-vehicle-card');
            for (var k = 0; k < cards.length; k++) {
                cards[k].addEventListener('click', function () {
                    var catId = parseInt(this.getAttribute('data-category-id'));
                    TB.Step2.selectVehicle(catId);
                });
            }
            // Bind select button clicks (stop propagation)
            var selectBtns = container.querySelectorAll('.tb-vehicle-card__select-btn');
            for (var m = 0; m < selectBtns.length; m++) {
                selectBtns[m].addEventListener('click', function (e) {
                    e.stopPropagation();
                    var catId = parseInt(this.closest('.tb-vehicle-card').getAttribute('data-category-id'));
                    TB.Step2.selectVehicle(catId);
                });
            }

            // Restore selection
            var selected = TB.State.get('selectedVehicle');
            if (selected) {
                var card = container.querySelector('[data-category-id="' + selected.category_id + '"]');
                if (card) card.classList.add('tb-selected');
                document.getElementById('tb-btn-continue').disabled = false;
            }
        },

        selectVehicle: function (categoryId) {
            // Deselect all
            var cards = document.querySelectorAll('.tb-vehicle-card');
            for (var i = 0; i < cards.length; i++) {
                cards[i].classList.remove('tb-selected');
            }
            // Select this one
            var card = document.querySelector('.tb-vehicle-card[data-category-id="' + categoryId + '"]');
            if (card) card.classList.add('tb-selected');

            // Update state
            var options = TB.State.get('vehicleOptions') || [];
            var vehicle = null;
            for (var j = 0; j < options.length; j++) {
                if (options[j].category_id === categoryId) {
                    vehicle = options[j];
                    break;
                }
            }
            TB.State.set('selectedVehicle', vehicle);
            TB.State.set('selectedExtras', []);
            TB.State.save();

            // Enable continue
            document.getElementById('tb-btn-continue').disabled = false;

            // Load extras filtered by selected vehicle category
            this.loadExtras(categoryId);

            // Update sidebar
            this.updateSidebar();
            this.updateQuote();
        },

        loadExtras: function (categoryId) {
            TB.API.getExtras(categoryId).then(function (data) {
                var extras = data.results || data;
                if (!Array.isArray(extras)) extras = [];
                TB.State.set('extras', extras);
                TB.Step2.renderExtras(extras);
            }).catch(function () {
                // Extras are optional, silently fail
            });
        },

        renderExtras: function (extras) {
            var section = document.getElementById('tb-extras-section');
            var container = document.getElementById('tb-extras-container');
            if (!section || !container) return;

            if (!extras || extras.length === 0) {
                section.style.display = 'none';
                return;
            }

            section.style.display = 'block';
            var html = '';

            for (var i = 0; i < extras.length; i++) {
                var e = extras[i];
                html += '<div class="tb-service-row" data-extra-id="' + e.id + '">';
                html += '<div class="tb-service-row__info">';
                html += '<div class="tb-service-row__name">' + TB.Utils.escapeHtml(e.name) + '</div>';
                html += '<div class="tb-service-row__price">' + TB.Utils.formatPrice(e.price);
                if (e.is_per_item) html += ' ' + (tbConfig.i18n.perItem || '/each');
                html += '</div>';
                if (e.description) {
                    html += '<div class="tb-service-row__desc">' + TB.Utils.escapeHtml(e.description) + '</div>';
                }
                html += '</div>';
                if (e.is_per_item) {
                    html += '<div class="tb-extra-qty" data-extra-id="' + e.id + '" style="display:none;margin-right:12px;">';
                    html += '<button type="button" data-action="decrease">-</button>';
                    html += '<span class="tb-extra-qty-value">1</span>';
                    html += '<button type="button" data-action="increase">+</button>';
                    html += '</div>';
                }
                html += '<label class="tb-toggle"><input type="checkbox" data-extra-id="' + e.id + '">';
                html += '<span class="tb-toggle__slider"></span></label>';
                html += '</div>';
            }

            container.innerHTML = html;

            // Bind toggle change
            var toggles = container.querySelectorAll('.tb-toggle input');
            for (var j = 0; j < toggles.length; j++) {
                toggles[j].addEventListener('change', function () {
                    var id = parseInt(this.getAttribute('data-extra-id'));
                    TB.Step2.toggleExtra(id);
                    // Show/hide qty counter for per-item extras
                    var row = this.closest('.tb-service-row');
                    var qtyDiv = row ? row.querySelector('.tb-extra-qty') : null;
                    if (qtyDiv) qtyDiv.style.display = this.checked ? 'flex' : 'none';
                });
            }

            // Bind quantity buttons
            var qtyBtns = container.querySelectorAll('.tb-extra-qty button');
            for (var k = 0; k < qtyBtns.length; k++) {
                qtyBtns[k].addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    var qtyContainer = this.closest('.tb-extra-qty');
                    var id = parseInt(qtyContainer.getAttribute('data-extra-id'));
                    var action = this.getAttribute('data-action');
                    TB.Step2.updateExtraQty(id, action === 'increase' ? 1 : -1);
                });
            }
        },

        toggleExtra: function (extraId) {
            var item = document.querySelector('.tb-extra-item[data-extra-id="' + extraId + '"]');
            var selected = TB.State.get('selectedExtras') || [];
            var extras = TB.State.get('extras') || [];

            var existingIdx = -1;
            for (var i = 0; i < selected.length; i++) {
                if (selected[i].id === extraId) { existingIdx = i; break; }
            }

            if (existingIdx >= 0) {
                selected.splice(existingIdx, 1);
                if (item) item.classList.remove('tb-selected');
            } else {
                var extra = null;
                for (var j = 0; j < extras.length; j++) {
                    if (extras[j].id === extraId) { extra = extras[j]; break; }
                }
                if (extra) {
                    selected.push({
                        id: extra.id,
                        name: extra.name,
                        price: extra.price,
                        quantity: 1,
                        is_per_item: extra.is_per_item
                    });
                    if (item) item.classList.add('tb-selected');
                }
            }

            TB.State.set('selectedExtras', selected);
            this.updateSidebar();
            this.updateQuote();
        },

        updateExtraQty: function (extraId, delta) {
            var selected = TB.State.get('selectedExtras') || [];
            for (var i = 0; i < selected.length; i++) {
                if (selected[i].id === extraId) {
                    selected[i].quantity = Math.max(1, Math.min(10, selected[i].quantity + delta));
                    // Update display
                    var qtyContainer = document.querySelector('.tb-extra-qty[data-extra-id="' + extraId + '"]');
                    if (qtyContainer) {
                        var span = qtyContainer.querySelector('.tb-extra-qty-value');
                        if (span) span.textContent = selected[i].quantity;
                    }
                    break;
                }
            }
            TB.State.set('selectedExtras', selected);
            this.updateSidebar();
            this.updateQuote();
        },

        updateQuote: function () {
            var vehicle = TB.State.get('selectedVehicle');
            if (!vehicle) return;

            var state = TB.State.getAll();
            var extrasPayload = [];
            var selected = state.selectedExtras || [];
            for (var i = 0; i < selected.length; i++) {
                extrasPayload.push({
                    extra_id: selected[i].id,
                    quantity: selected[i].quantity
                });
            }

            TB.API.getQuote({
                pickup_address: state.pickupAddress,
                pickup_latitude: state.pickupLat,
                pickup_longitude: state.pickupLng,
                dropoff_address: state.dropoffAddress,
                dropoff_latitude: state.dropoffLat,
                dropoff_longitude: state.dropoffLng,
                vehicle_category_id: vehicle.category_id,
                passengers: state.passengers,
                is_round_trip: state.isRoundTrip,
                extras: extrasPayload
            }).then(function (quote) {
                TB.State.set('quoteData', quote);
                TB.State.set('totalPrice', quote.total_price);
                TB.State.set('currency', quote.currency || 'MAD');
                TB.Step2.updateSidebarTotal(quote);
            }).catch(function () {
                // Quote is optional enrichment; pricing from get_pricing is sufficient
            });
        },

        updateSidebar: function () {
            var state = TB.State.getAll();
            var sRoute = document.getElementById('tb-sidebar-route');
            var sDate = document.getElementById('tb-sidebar-date');
            var sVehicle = document.getElementById('tb-sidebar-vehicle');
            var sPass = document.getElementById('tb-sidebar-passengers');

            if (sRoute) sRoute.textContent = TB.Utils.shortName(state.pickupAddress) + ' → ' + TB.Utils.shortName(state.dropoffAddress);
            if (sDate) sDate.textContent = TB.Utils.formatDateTime(state.pickupDatetime);
            if (sVehicle) sVehicle.textContent = state.selectedVehicle ? state.selectedVehicle.category_name : '--';
            if (sPass) sPass.textContent = state.passengers;

            // Extras list
            var extrasList = document.getElementById('tb-sidebar-extras-list');
            if (extrasList) {
                var selectedExtras = state.selectedExtras || [];
                var html = '';
                for (var i = 0; i < selectedExtras.length; i++) {
                    var e = selectedExtras[i];
                    var price = e.price * (e.is_per_item ? e.quantity : 1);
                    html += '<div class="tb-summary-item">';
                    html += '<span class="tb-summary-label">' + TB.Utils.escapeHtml(e.name);
                    if (e.is_per_item && e.quantity > 1) html += ' x' + e.quantity;
                    html += '</span>';
                    html += '<span class="tb-summary-value">' + TB.Utils.formatPrice(price) + '</span>';
                    html += '</div>';
                }
                extrasList.innerHTML = html;
            }

            // Total
            var total = document.getElementById('tb-sidebar-total');
            if (total) {
                var vehicle = state.selectedVehicle;
                var basePrice = vehicle ? vehicle.price : 0;
                var extrasTotal = 0;
                var se = state.selectedExtras || [];
                for (var j = 0; j < se.length; j++) {
                    extrasTotal += se[j].price * (se[j].is_per_item ? se[j].quantity : 1);
                }
                var t = basePrice + extrasTotal;
                if (state.isRoundTrip) t *= 2;
                total.textContent = TB.Utils.formatPrice(t);
            }
        },

        updateSidebarTotal: function (quote) {
            var total = document.getElementById('tb-sidebar-total');
            if (total && quote.total_price) {
                total.textContent = TB.Utils.formatPrice(quote.total_price, quote.currency);
            }
        },

        validate: function () {
            if (!TB.State.get('selectedVehicle')) {
                alert(tbConfig.i18n.selectVehicle);
                return false;
            }
            return true;
        },

        onNext: function () {
            if (!this.validate()) return false;
            TB.State.save();
            TB.Wizard.showStep(3);
            return true;
        }
    };
})();
