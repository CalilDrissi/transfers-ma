(function () {
    'use strict';
    window.TB = window.TB || {};
    TB.Step2 = {
        init: function () {
            this.loadVehicles();
            this.loadExtras();
            this.updateSidebar();
            this.bindEvents();
        },
        bindEvents: function () {
            var self = this;
            var btn = document.getElementById('tb-btn-continue');
            if (btn) btn.addEventListener('click', function () { self.onNext(); });
            var backBtns = document.querySelectorAll('#tb-step-2 .tb-btn-back');
            for (var i = 0; i < backBtns.length; i++) {
                backBtns[i].addEventListener('click', function () { TB.Wizard.showStep(1); });
            }
        },
        loadVehicles: function () {
            var container = document.getElementById('tb-vehicles-container');
            container.innerHTML = '<div class="tb-loading"><span class="tb-spinner"></span> ' + tbConfig.i18n.loading + '</div>';
            var state = TB.State.getAll();
            TB.API.getPricing(state.pickupLat, state.pickupLng, state.dropoffLat, state.dropoffLng, state.passengers)
                .then(function (data) {
                    if (data.pricing_type === 'calculated' && tbConfig.showNoRouteMessage) {
                        TB.Step2.renderNoRouteMessage();
                        return;
                    }
                    TB.State.set('pricingData', data);
                    TB.State.set('vehicleOptions', data.vehicle_options || []);
                    TB.Step2.renderVehicles(data);
                    TB.Step2.renderRouteInfo(data);
                }).catch(function (err) {
                    if (tbConfig.showNoRouteMessage) TB.Step2.renderNoRouteMessage();
                    else container.innerHTML = '<div class="tb-alert tb-alert--error">' + TB.Utils.escapeHtml(err.message || tbConfig.i18n.errorGeneric) + '</div>';
                });
        },
        renderNoRouteMessage: function () {
            var container = document.getElementById('tb-vehicles-container');
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
        },
        renderVehicles: function (data) {
            var container = document.getElementById('tb-vehicles-container');
            var options = data.vehicle_options || [];
            if (options.length === 0) {
                container.innerHTML = '<div class="tb-loading">' + tbConfig.i18n.noVehicles + '</div>';
                return;
            }
            var html = '';
            for (var i = 0; i < options.length; i++) {
                var v = options[i];
                html += '<div class="tb-vehicle-card" data-category-id="' + v.category_id + '">';
                html += '<div class="tb-vehicle-image">';
                if (v.category_icon) html += '<i class="' + TB.Utils.escapeHtml(v.category_icon) + '"></i>';
                else html += '&#128663;';
                html += '</div><div class="tb-vehicle-info">';
                html += '<div class="tb-vehicle-name">' + TB.Utils.escapeHtml(v.category_name || v.vehicle_name) + '</div>';
                if (v.vehicle_name && v.vehicle_name !== v.category_name)
                    html += '<div class="tb-vehicle-desc">' + TB.Utils.escapeHtml(v.vehicle_name) + '</div>';
                html += '<div class="tb-vehicle-specs">';
                html += '<span>' + (v.passengers || '--') + ' ' + tbConfig.i18n.passengers + '</span>';
                html += '<span>' + (v.luggage || '--') + ' ' + tbConfig.i18n.bags + '</span>';
                html += '</div>';
                if (v.features && v.features.length > 0) {
                    html += '<div class="tb-vehicle-features">';
                    for (var j = 0; j < v.features.length; j++)
                        html += '<span class="tb-feature-tag">' + TB.Utils.escapeHtml(v.features[j]) + '</span>';
                    html += '</div>';
                }
                html += '</div><div class="tb-vehicle-price">';
                html += '<div class="tb-price-value">' + TB.Utils.formatPrice(v.price) + '</div>';
                html += '<div class="tb-price-label">' + tbConfig.i18n.totalPrice + '</div>';
                html += '</div></div>';
            }
            container.innerHTML = html;
            var cards = container.querySelectorAll('.tb-vehicle-card');
            for (var k = 0; k < cards.length; k++) {
                cards[k].addEventListener('click', function () {
                    var catId = parseInt(this.getAttribute('data-category-id'));
                    TB.Step2.selectVehicle(catId);
                });
            }
            var selected = TB.State.get('selectedVehicle');
            if (selected) {
                var card = container.querySelector('[data-category-id="' + selected.category_id + '"]');
                if (card) card.classList.add('tb-selected');
                document.getElementById('tb-btn-continue').disabled = false;
            }
        },
        selectVehicle: function (categoryId) {
            var cards = document.querySelectorAll('.tb-vehicle-card');
            for (var i = 0; i < cards.length; i++) cards[i].classList.remove('tb-selected');
            var card = document.querySelector('.tb-vehicle-card[data-category-id="' + categoryId + '"]');
            if (card) card.classList.add('tb-selected');
            var options = TB.State.get('vehicleOptions') || [];
            var vehicle = null;
            for (var j = 0; j < options.length; j++) {
                if (options[j].category_id === categoryId) { vehicle = options[j]; break; }
            }
            TB.State.set('selectedVehicle', vehicle);
            TB.State.save();
            document.getElementById('tb-btn-continue').disabled = false;
            this.updateSidebar();
            this.updateQuote();
        },
        loadExtras: function () {
            TB.API.getExtras().then(function (data) {
                var extras = data.results || data;
                if (!Array.isArray(extras)) extras = [];
                TB.State.set('extras', extras);
                TB.Step2.renderExtras(extras);
            }).catch(function () {});
        },
        renderExtras: function (extras) {
            var section = document.getElementById('tb-extras-section');
            var container = document.getElementById('tb-extras-container');
            if (!section || !container) return;
            if (!extras || extras.length === 0) { section.style.display = 'none'; return; }
            section.style.display = 'block';
            var html = '';
            for (var i = 0; i < extras.length; i++) {
                var e = extras[i];
                html += '<div class="tb-extra-item" data-extra-id="' + e.id + '">';
                html += '<div class="tb-extra-info"><div class="tb-extra-check">&#10003;</div><div>';
                html += '<div class="tb-extra-name">' + TB.Utils.escapeHtml(e.name) + '</div>';
                if (e.description) html += '<div class="tb-extra-desc">' + TB.Utils.escapeHtml(e.description) + '</div>';
                html += '</div></div><div class="tb-extra-right">';
                if (e.is_per_item) {
                    html += '<div class="tb-extra-qty" data-extra-id="' + e.id + '">';
                    html += '<button type="button" data-action="decrease">-</button>';
                    html += '<span class="tb-extra-qty-value">1</span>';
                    html += '<button type="button" data-action="increase">+</button></div>';
                }
                html += '<div class="tb-extra-price">' + TB.Utils.formatPrice(e.price);
                if (e.is_per_item) html += tbConfig.i18n.perItem;
                html += '</div></div></div>';
            }
            container.innerHTML = html;
            var items = container.querySelectorAll('.tb-extra-item');
            for (var j = 0; j < items.length; j++) {
                items[j].addEventListener('click', function (ev) {
                    if (ev.target.tagName === 'BUTTON') return;
                    TB.Step2.toggleExtra(parseInt(this.getAttribute('data-extra-id')));
                });
            }
            var qtyBtns = container.querySelectorAll('.tb-extra-qty button');
            for (var k = 0; k < qtyBtns.length; k++) {
                qtyBtns[k].addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    var qtyContainer = this.closest('.tb-extra-qty');
                    var id = parseInt(qtyContainer.getAttribute('data-extra-id'));
                    TB.Step2.updateExtraQty(id, this.getAttribute('data-action') === 'increase' ? 1 : -1);
                });
            }
        },
        toggleExtra: function (extraId) {
            var item = document.querySelector('.tb-extra-item[data-extra-id="' + extraId + '"]');
            var selected = TB.State.get('selectedExtras') || [];
            var extras = TB.State.get('extras') || [];
            var existingIdx = -1;
            for (var i = 0; i < selected.length; i++) { if (selected[i].id === extraId) { existingIdx = i; break; } }
            if (existingIdx >= 0) {
                selected.splice(existingIdx, 1);
                if (item) item.classList.remove('tb-selected');
            } else {
                var extra = null;
                for (var j = 0; j < extras.length; j++) { if (extras[j].id === extraId) { extra = extras[j]; break; } }
                if (extra) {
                    selected.push({ id: extra.id, name: extra.name, price: extra.price, quantity: 1, is_per_item: extra.is_per_item });
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
                    var qtyContainer = document.querySelector('.tb-extra-qty[data-extra-id="' + extraId + '"]');
                    if (qtyContainer) { var span = qtyContainer.querySelector('.tb-extra-qty-value'); if (span) span.textContent = selected[i].quantity; }
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
            for (var i = 0; i < selected.length; i++) extrasPayload.push({ extra_id: selected[i].id, quantity: selected[i].quantity });
            TB.API.getQuote({
                pickup_address: state.pickupAddress, pickup_latitude: state.pickupLat, pickup_longitude: state.pickupLng,
                dropoff_address: state.dropoffAddress, dropoff_latitude: state.dropoffLat, dropoff_longitude: state.dropoffLng,
                vehicle_category_id: vehicle.category_id, passengers: state.passengers, is_round_trip: state.isRoundTrip,
                extras: extrasPayload
            }).then(function (quote) {
                TB.State.set('quoteData', quote);
                TB.State.set('totalPrice', quote.total_price);
                TB.State.set('currency', quote.currency || 'MAD');
                TB.Step2.updateSidebarTotal(quote);
            }).catch(function () {});
        },
        updateSidebar: function () {
            var state = TB.State.getAll();
            var sRoute = document.getElementById('tb-sidebar-route');
            var sDate = document.getElementById('tb-sidebar-date');
            var sVehicle = document.getElementById('tb-sidebar-vehicle');
            var sPass = document.getElementById('tb-sidebar-passengers');
            if (sRoute) sRoute.textContent = TB.Utils.shortName(state.pickupAddress) + ' \u2192 ' + TB.Utils.shortName(state.dropoffAddress);
            if (sDate) sDate.textContent = TB.Utils.formatDateTime(state.pickupDatetime);
            if (sVehicle) sVehicle.textContent = state.selectedVehicle ? state.selectedVehicle.category_name : '--';
            if (sPass) sPass.textContent = state.passengers;
            var extrasList = document.getElementById('tb-sidebar-extras-list');
            if (extrasList) {
                var selectedExtras = state.selectedExtras || [];
                var html = '';
                for (var i = 0; i < selectedExtras.length; i++) {
                    var e = selectedExtras[i];
                    var price = e.price * (e.is_per_item ? e.quantity : 1);
                    html += '<div class="tb-summary-item"><span class="tb-summary-label">' + TB.Utils.escapeHtml(e.name);
                    if (e.is_per_item && e.quantity > 1) html += ' x' + e.quantity;
                    html += '</span><span class="tb-summary-value">' + TB.Utils.formatPrice(price) + '</span></div>';
                }
                extrasList.innerHTML = html;
            }
            var total = document.getElementById('tb-sidebar-total');
            if (total) {
                var vehicle = state.selectedVehicle;
                var basePrice = vehicle ? vehicle.price : 0;
                var extrasTotal = 0;
                var se = state.selectedExtras || [];
                for (var j = 0; j < se.length; j++) extrasTotal += se[j].price * (se[j].is_per_item ? se[j].quantity : 1);
                var t = basePrice + extrasTotal;
                if (state.isRoundTrip) t *= 2;
                total.textContent = TB.Utils.formatPrice(t);
            }
        },
        updateSidebarTotal: function (quote) {
            var total = document.getElementById('tb-sidebar-total');
            if (total && quote.total_price) total.textContent = TB.Utils.formatPrice(quote.total_price, quote.currency);
        },
        validate: function () {
            if (!TB.State.get('selectedVehicle')) {
                var container = document.getElementById('tb-vehicles-container');
                if (container) {
                    // Remove any previous inline error
                    var prev = container.querySelector('.tb-alert--error');
                    if (prev) prev.remove();
                    var errDiv = document.createElement('div');
                    errDiv.className = 'tb-alert tb-alert--error';
                    errDiv.textContent = tbConfig.i18n.selectVehicle;
                    container.insertBefore(errDiv, container.firstChild);
                    errDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
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
