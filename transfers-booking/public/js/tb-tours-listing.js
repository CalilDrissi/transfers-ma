/**
 * Tours listing page — loads trips from API, renders cards, handles filters.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n, allTrips, filteredTrips;

    TB.ToursListing = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};
            allTrips = [];
            filteredTrips = [];

            this.loadTrips();
            this.initFilters();
        },

        /* ── Load trips ───────────────────────── */

        loadTrips: function () {
            var self = this;

            TB.API._call('get_trips', { is_active: true }).then(function (data) {
                allTrips = Array.isArray(data) ? data : (data && data.results ? data.results : []);
                hideLoading();

                if (allTrips.length === 0) {
                    showEmpty();
                    return;
                }

                // Populate city filter from data
                self.populateCityFilter(allTrips);

                filteredTrips = allTrips.slice();
                self.applySort();
                self.renderCards();
            }).catch(function (err) {
                hideLoading();
                showEmpty(err.message);
            });
        },

        /* ── Populate city filter ─────────────── */

        populateCityFilter: function (trips) {
            var cities = {};
            for (var i = 0; i < trips.length; i++) {
                var city = trips[i].departure_location;
                if (city && !cities[city]) {
                    cities[city] = true;
                }
            }

            var select = document.getElementById('tb-tours-filter-city');
            if (!select) return;

            var sorted = Object.keys(cities).sort();
            for (var j = 0; j < sorted.length; j++) {
                var opt = document.createElement('option');
                opt.value = sorted[j];
                opt.textContent = sorted[j];
                select.appendChild(opt);
            }
        },

        /* ── Filters ──────────────────────────── */

        initFilters: function () {
            var self = this;
            var filterIds = ['tb-tours-filter-type', 'tb-tours-filter-city', 'tb-tours-filter-price', 'tb-tours-filter-sort'];

            for (var i = 0; i < filterIds.length; i++) {
                var el = document.getElementById(filterIds[i]);
                if (el) {
                    el.addEventListener('change', function () {
                        self.applyFilters();
                    });
                }
            }
        },

        applyFilters: function () {
            var typeVal = selectVal('tb-tours-filter-type');
            var cityVal = selectVal('tb-tours-filter-city');
            var priceVal = selectVal('tb-tours-filter-price');

            filteredTrips = allTrips.filter(function (trip) {
                // Type filter
                if (typeVal && trip.trip_type !== typeVal) return false;

                // City filter
                if (cityVal && trip.departure_location !== cityVal) return false;

                // Price filter
                if (priceVal) {
                    var price = parseFloat(trip.price_per_person) || 0;
                    if (priceVal === '0-500' && price >= 500) return false;
                    if (priceVal === '500-1000' && (price < 500 || price >= 1000)) return false;
                    if (priceVal === '1000-2000' && (price < 1000 || price >= 2000)) return false;
                    if (priceVal === '2000+' && price < 2000) return false;
                }

                return true;
            });

            this.applySort();
            this.renderCards();
        },

        applySort: function () {
            var sortVal = selectVal('tb-tours-filter-sort') || 'featured';

            filteredTrips.sort(function (a, b) {
                switch (sortVal) {
                    case 'price_low':
                        return (parseFloat(a.price_per_person) || 0) - (parseFloat(b.price_per_person) || 0);
                    case 'price_high':
                        return (parseFloat(b.price_per_person) || 0) - (parseFloat(a.price_per_person) || 0);
                    case 'name':
                        return (a.name || '').localeCompare(b.name || '');
                    default: // featured
                        if (a.is_featured && !b.is_featured) return -1;
                        if (!a.is_featured && b.is_featured) return 1;
                        return (a.order || 0) - (b.order || 0);
                }
            });
        },

        /* ── Render cards ─────────────────────── */

        renderCards: function () {
            var grid = document.getElementById('tb-tours-grid');
            var template = document.getElementById('tb-tours-card-template');
            if (!grid || !template) return;

            grid.innerHTML = '';

            if (filteredTrips.length === 0) {
                grid.style.display = 'none';
                showEmpty();
                return;
            }

            hideEmpty();
            grid.style.display = 'grid';

            var currency = cfg.currencySymbol || 'MAD';
            var toursUrl = cfg.toursPageUrl || '/tours/';

            for (var i = 0; i < filteredTrips.length; i++) {
                var trip = filteredTrips[i];
                var clone = template.content.cloneNode(true);
                var card = clone.querySelector('.tb-tours-card');

                // Image
                var img = clone.querySelector('.tb-tours-card__image');
                if (trip.featured_image) {
                    img.src = trip.featured_image;
                    img.alt = trip.name || '';
                } else {
                    img.style.display = 'none';
                }

                // Featured badge
                if (trip.is_featured) {
                    var featBadge = clone.querySelector('.tb-tours-card__badge--featured');
                    if (featBadge) featBadge.style.display = 'inline-block';
                }

                // Type badge
                var typeBadge = clone.querySelector('.tb-tours-card__badge--type');
                if (typeBadge && trip.trip_type) {
                    typeBadge.textContent = formatTripType(trip.trip_type);
                }

                // Name
                var nameEl = clone.querySelector('.tb-tours-card__name');
                if (nameEl) nameEl.textContent = trip.name || '';

                // Description
                var descEl = clone.querySelector('.tb-tours-card__description');
                if (descEl) descEl.textContent = trip.short_description || '';

                // Duration
                var durEl = clone.querySelector('.tb-tours-card__duration-text');
                if (durEl) {
                    var dur = '';
                    if (trip.duration_days && trip.duration_days > 0) {
                        dur = trip.duration_days + ' ' + (trip.duration_days > 1 ? (i18n.days || 'days') : (i18n.day || 'day'));
                    } else if (trip.duration_hours) {
                        dur = trip.duration_hours + ' ' + (i18n.hours || 'hours');
                    }
                    durEl.textContent = dur;
                }

                // City
                var cityEl = clone.querySelector('.tb-tours-card__city-text');
                if (cityEl) cityEl.textContent = trip.departure_location || '';

                // Price
                var priceVal = clone.querySelector('.tb-tours-card__price-value');
                var priceUnit = clone.querySelector('.tb-tours-card__price-unit');
                if (priceVal) priceVal.textContent = formatPrice(trip.price_per_person, currency);
                if (priceUnit) priceUnit.textContent = trip.pricing_model === 'per_group' ? ('/' + (i18n.group || 'group')) : ('/' + (i18n.person || 'person'));

                // View details link
                var btn = clone.querySelector('.tb-tours-card__btn');
                if (btn) {
                    btn.href = toursUrl.replace(/\/$/, '') + '/' + (trip.slug || trip.id) + '/';
                }

                grid.appendChild(clone);
            }
        }
    };

    /* ── Helpers ──────────────────────────────── */

    function selectVal(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    }

    function formatTripType(type) {
        var map = {
            'day_trip': 'Day Trip',
            'half_day': 'Half Day',
            'multi_day': 'Multi-Day',
            'private': 'Private',
            'group': 'Group'
        };
        return map[type] || type;
    }

    function formatPrice(amount, currency) {
        var num = Math.round(parseFloat(amount));
        if (isNaN(num)) return '--';
        var cfg2 = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        var pos = cfg2.currencyPosition || 'after';
        if (pos === 'before') return currency + ' ' + num;
        return num + ' ' + currency;
    }

    function hideLoading() {
        var el = document.getElementById('tb-tours-loading');
        if (el) el.style.display = 'none';
    }

    function showEmpty(msg) {
        var el = document.getElementById('tb-tours-empty');
        if (el) {
            el.style.display = 'block';
            if (msg) {
                var p = el.querySelector('p');
                if (p) p.textContent = msg;
            }
        }
    }

    function hideEmpty() {
        var el = document.getElementById('tb-tours-empty');
        if (el) el.style.display = 'none';
    }

    /* ── Boot ─────────────────────────────────── */

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('tb-tours-listing')) {
            TB.ToursListing.init();
        }
    });

})();
