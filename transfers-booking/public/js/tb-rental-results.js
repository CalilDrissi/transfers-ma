/**
 * Rental results page — vehicle listing, filtering, sorting, pagination.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n, params, allVehicles, filteredVehicles;
    var currentPage = 1;
    var perPage = 12;

    TB.RentalResults = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};
            allVehicles = [];
            filteredVehicles = [];

            params = this.parseParams();
            if (!params.city || !params.pickup_date || !params.return_date) {
                window.location.href = '/';
                return;
            }

            this.populateSearchBar();
            this.initSort();
            this.initFilters();
            this.searchVehicles();
        },

        /* ── Parse URL params ─────────────────── */

        parseParams: function () {
            var sp = new URLSearchParams(window.location.search);
            return {
                city: sp.get('city') || '',
                city_name: sp.get('city_name') || '',
                pickup_date: sp.get('pickup_date') || '',
                return_date: sp.get('return_date') || '',
                category: sp.get('category') || ''
            };
        },

        /* ── Populate search bar ──────────────── */

        populateSearchBar: function () {
            setText('tb-rental-city-display', params.city_name || params.city);
            setText('tb-rental-pickup-display', formatDate(params.pickup_date));
            setText('tb-rental-return-display', formatDate(params.return_date));

            var days = calcDays(params.pickup_date, params.return_date);
            setText('tb-rental-days-display', days + ' ' + (days === 1 ? (i18n.day || 'day') : (i18n.days || 'days')));
        },

        /* ── Search vehicles ──────────────────── */

        searchVehicles: function () {
            var self = this;
            showLoading(true);
            showEmpty(false);

            var searchParams = {
                city: params.city,
                pickup_date: params.pickup_date,
                return_date: params.return_date
            };
            if (params.category) {
                searchParams.category = params.category;
            }

            TB.API._call('rental_search', searchParams).then(function (data) {
                showLoading(false);
                var vehicles = Array.isArray(data) ? data : (data.results || []);
                allVehicles = vehicles;

                if (vehicles.length === 0) {
                    showEmpty(true);
                    return;
                }

                self.buildCategoryFilters(vehicles);
                self.applyFilters();
            }).catch(function (err) {
                showLoading(false);
                showEmpty(true);
                console.error('Rental search error:', err.message);
            });
        },

        /* ── Build dynamic category filters ───── */

        buildCategoryFilters: function (vehicles) {
            var container = document.getElementById('tb-rental-filter-category');
            if (!container) return;

            var categories = {};
            vehicles.forEach(function (v) {
                var cat = v.category_name || v.category || 'Other';
                categories[cat] = (categories[cat] || 0) + 1;
            });

            container.innerHTML = '';
            Object.keys(categories).forEach(function (cat) {
                var label = document.createElement('label');
                label.className = 'tb-rental-filters__option';
                label.innerHTML =
                    '<input type="checkbox" value="' + escapeHtml(cat) + '" data-filter="category">' +
                    '<span>' + escapeHtml(cat) + ' (' + categories[cat] + ')</span>';
                container.appendChild(label);
            });

            // Re-bind filter events
            container.querySelectorAll('input').forEach(function (cb) {
                cb.addEventListener('change', TB.RentalResults.applyFilters.bind(TB.RentalResults));
            });
        },

        /* ── Sorting ──────────────────────────── */

        initSort: function () {
            var sortSelect = document.getElementById('tb-rental-sort');
            if (!sortSelect) return;

            sortSelect.addEventListener('change', this.applyFilters.bind(this));
        },

        /* ── Filters ──────────────────────────── */

        initFilters: function () {
            var self = this;

            // Checkbox filters
            document.querySelectorAll('#tb-rental-filters input[type="checkbox"]').forEach(function (cb) {
                cb.addEventListener('change', function () {
                    self.applyFilters();
                });
            });

            // Price range
            var priceRange = document.getElementById('tb-rental-filter-price');
            if (priceRange) {
                priceRange.addEventListener('input', function () {
                    var display = document.getElementById('tb-rental-filter-price-value');
                    if (display) display.textContent = priceRange.value;
                    self.applyFilters();
                });
            }

            // Clear filters
            var clearBtn = document.getElementById('tb-rental-filters-clear');
            if (clearBtn) {
                clearBtn.addEventListener('click', function () {
                    document.querySelectorAll('#tb-rental-filters input[type="checkbox"]').forEach(function (cb) {
                        cb.checked = false;
                    });
                    if (priceRange) {
                        priceRange.value = priceRange.max;
                        var display = document.getElementById('tb-rental-filter-price-value');
                        if (display) display.textContent = priceRange.max;
                    }
                    self.applyFilters();
                });
            }
        },

        applyFilters: function () {
            var selectedCategories = getCheckedValues('category');
            var selectedTransmission = getCheckedValues('transmission');
            var selectedFuel = getCheckedValues('fuel_type');
            var priceRange = document.getElementById('tb-rental-filter-price');
            var maxPrice = priceRange ? parseInt(priceRange.value, 10) : Infinity;

            filteredVehicles = allVehicles.filter(function (v) {
                // Category filter
                if (selectedCategories.length > 0) {
                    var cat = v.category_name || v.category || '';
                    if (selectedCategories.indexOf(cat) === -1) return false;
                }
                // Transmission filter
                if (selectedTransmission.length > 0) {
                    var trans = (v.transmission || '').toLowerCase();
                    if (selectedTransmission.indexOf(trans) === -1) return false;
                }
                // Fuel type filter
                if (selectedFuel.length > 0) {
                    var fuel = (v.fuel_type || '').toLowerCase();
                    if (selectedFuel.indexOf(fuel) === -1) return false;
                }
                // Price range
                var dailyPrice = v.daily_price || v.price_per_day || 0;
                if (dailyPrice > maxPrice) return false;

                return true;
            });

            // Sort
            var sortSelect = document.getElementById('tb-rental-sort');
            var sortValue = sortSelect ? sortSelect.value : 'price_asc';
            this.sortVehicles(filteredVehicles, sortValue);

            currentPage = 1;
            this.renderVehicles();
        },

        sortVehicles: function (vehicles, sortBy) {
            vehicles.sort(function (a, b) {
                switch (sortBy) {
                    case 'price_asc':
                        return (a.daily_price || a.price_per_day || 0) - (b.daily_price || b.price_per_day || 0);
                    case 'price_desc':
                        return (b.daily_price || b.price_per_day || 0) - (a.daily_price || a.price_per_day || 0);
                    case 'rating_desc':
                        return (b.company_rating || b.rating || 0) - (a.company_rating || a.rating || 0);
                    default:
                        return 0;
                }
            });
        },

        /* ── Render vehicles ──────────────────── */

        renderVehicles: function () {
            var grid = document.getElementById('tb-rental-grid');
            var template = document.getElementById('tb-rental-card-template');
            if (!grid || !template) return;

            grid.innerHTML = '';

            if (filteredVehicles.length === 0) {
                showEmpty(true);
                updatePagination(0, 0, 0);
                return;
            }
            showEmpty(false);

            var totalPages = Math.ceil(filteredVehicles.length / perPage);
            var start = (currentPage - 1) * perPage;
            var end = Math.min(start + perPage, filteredVehicles.length);
            var pageVehicles = filteredVehicles.slice(start, end);
            var days = calcDays(params.pickup_date, params.return_date);

            pageVehicles.forEach(function (v) {
                var card = template.content.cloneNode(true);
                var cardEl = card.querySelector('.tb-rental-card');

                cardEl.setAttribute('data-vehicle-id', v.id || '');

                // Image
                var img = card.querySelector('.tb-rental-card__img');
                if (img) {
                    img.src = v.image || v.photo || '';
                    img.alt = v.name || '';
                }

                // Name & category
                var nameEl = card.querySelector('.tb-rental-card__name');
                if (nameEl) nameEl.textContent = v.name || '';
                var catEl = card.querySelector('.tb-rental-card__category');
                if (catEl) catEl.textContent = v.category_name || v.category || '';

                // Company
                var compLogo = card.querySelector('.tb-rental-card__company-logo');
                if (compLogo) {
                    if (v.company_logo) {
                        compLogo.src = v.company_logo;
                        compLogo.alt = v.company_name || '';
                    } else {
                        compLogo.style.display = 'none';
                    }
                }
                var compName = card.querySelector('.tb-rental-card__company-name');
                if (compName) compName.textContent = v.company_name || '';

                // Rating
                var ratingStars = card.querySelector('.tb-rating-stars');
                var ratingValue = card.querySelector('.tb-rental-card__rating-value');
                var rating = v.company_rating || v.rating || 0;
                if (ratingStars) ratingStars.innerHTML = renderStars(rating);
                if (ratingValue) ratingValue.textContent = rating ? rating.toFixed(1) : '';

                // Specs
                setSpecValue(card, 'passengers', v.passengers || v.seats || '--');
                setSpecValue(card, 'luggage', v.luggage || v.trunk_capacity || '--');
                setSpecValue(card, 'doors', v.doors || '--');
                setSpecValue(card, 'transmission', v.transmission || '--');

                // Features
                var featuresEl = card.querySelector('.tb-rental-card__features');
                if (featuresEl && v.features && Array.isArray(v.features)) {
                    featuresEl.innerHTML = v.features.slice(0, 4).map(function (f) {
                        return '<span class="tb-rental-card__feature">' +
                            '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                            escapeHtml(f) + '</span>';
                    }).join('');
                }

                // Pricing
                var dailyPrice = v.daily_price || v.price_per_day || 0;
                var totalPrice = v.total_price || (dailyPrice * days);
                var currency = v.currency || cfg.currencySymbol || 'MAD';

                var priceVal = card.querySelector('.tb-rental-card__price-value');
                if (priceVal) priceVal.textContent = formatPrice(dailyPrice, currency);
                var totalVal = card.querySelector('.tb-rental-card__total-value');
                if (totalVal) totalVal.textContent = formatPrice(totalPrice, currency);

                // Book button
                var bookBtn = card.querySelector('.tb-rental-card__book-btn');
                if (bookBtn) {
                    bookBtn.addEventListener('click', function () {
                        TB.RentalResults.goToCheckout(v);
                    });
                }

                grid.appendChild(card);
            });

            updatePagination(currentPage, totalPages, filteredVehicles.length);
        },

        /* ── Navigate to checkout ─────────────── */

        goToCheckout: function (vehicle) {
            var checkoutUrl = cfg.rentalCheckoutPageUrl || '/rental-checkout/';
            var days = calcDays(params.pickup_date, params.return_date);
            var dailyPrice = vehicle.daily_price || vehicle.price_per_day || 0;
            var totalPrice = vehicle.total_price || (dailyPrice * days);

            var qp = new URLSearchParams();
            qp.set('vehicle_id', vehicle.id || '');
            qp.set('city', params.city);
            qp.set('city_name', params.city_name || params.city);
            qp.set('pickup_date', params.pickup_date);
            qp.set('return_date', params.return_date);
            qp.set('daily_price', dailyPrice);
            qp.set('total_price', totalPrice);
            qp.set('currency', vehicle.currency || cfg.currencySymbol || 'MAD');
            qp.set('vehicle_name', vehicle.name || '');
            qp.set('company_name', vehicle.company_name || '');
            qp.set('vehicle_image', vehicle.image || vehicle.photo || '');
            qp.set('days', days);

            window.location.href = checkoutUrl + '?' + qp.toString();
        }
    };

    /* ── Pagination ───────────────────────────── */

    function updatePagination(page, totalPages, totalCount) {
        var paginationEl = document.getElementById('tb-rental-pagination');
        var prevBtn = document.getElementById('tb-rental-prev');
        var nextBtn = document.getElementById('tb-rental-next');
        var pageInfo = document.getElementById('tb-rental-page-info');

        if (!paginationEl) return;

        if (totalPages <= 1) {
            paginationEl.style.display = 'none';
            return;
        }

        paginationEl.style.display = 'flex';
        if (pageInfo) pageInfo.textContent = page + ' / ' + totalPages + ' (' + totalCount + ' ' + (i18n.vehicles || 'vehicles') + ')';
        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= totalPages;

        if (prevBtn) {
            prevBtn.onclick = function () {
                if (currentPage > 1) {
                    currentPage--;
                    TB.RentalResults.renderVehicles();
                    scrollToTop();
                }
            };
        }
        if (nextBtn) {
            nextBtn.onclick = function () {
                if (currentPage < totalPages) {
                    currentPage++;
                    TB.RentalResults.renderVehicles();
                    scrollToTop();
                }
            };
        }
    }

    /* ── Helpers ───────────────────────────────── */

    function getCheckedValues(filterName) {
        var checked = [];
        document.querySelectorAll('input[data-filter="' + filterName + '"]:checked').forEach(function (cb) {
            checked.push(cb.value.toLowerCase());
        });
        return checked;
    }

    function showLoading(show) {
        var el = document.getElementById('tb-rental-loading');
        if (el) el.style.display = show ? 'block' : 'none';
    }

    function showEmpty(show) {
        var el = document.getElementById('tb-rental-empty');
        if (el) el.style.display = show ? 'block' : 'none';
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text || '--';
    }

    function setSpecValue(card, spec, value) {
        var specEl = card.querySelector('[data-spec="' + spec + '"] .tb-spec-icon__value');
        if (specEl) specEl.textContent = value;
    }

    function calcDays(pickup, ret) {
        if (!pickup || !ret) return 1;
        var d1 = new Date(pickup);
        var d2 = new Date(ret);
        var diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '--';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function formatPrice(amount, currency) {
        currency = currency || (cfg && cfg.currencySymbol) || 'MAD';
        var position = (cfg && cfg.currencyPosition) || 'after';
        var num = Math.round(parseFloat(amount));
        if (isNaN(num)) return '--';
        if (position === 'before') return currency + ' ' + num;
        return num + ' ' + currency;
    }

    function renderStars(rating) {
        var html = '';
        var full = Math.floor(rating);
        var half = (rating - full) >= 0.5;
        for (var i = 0; i < 5; i++) {
            if (i < full) {
                html += '<svg width="12" height="12" viewBox="0 0 12 12" fill="#F59E0B"><path d="M6 1l1.4 2.8 3.1.5-2.2 2.2.5 3.1L6 8.2 3.2 9.6l.5-3.1L1.5 4.3l3.1-.5L6 1z"/></svg>';
            } else if (i === full && half) {
                html += '<svg width="12" height="12" viewBox="0 0 12 12"><defs><linearGradient id="half"><stop offset="50%" stop-color="#F59E0B"/><stop offset="50%" stop-color="#D1D5DB"/></linearGradient></defs><path d="M6 1l1.4 2.8 3.1.5-2.2 2.2.5 3.1L6 8.2 3.2 9.6l.5-3.1L1.5 4.3l3.1-.5L6 1z" fill="url(#half)"/></svg>';
            } else {
                html += '<svg width="12" height="12" viewBox="0 0 12 12" fill="#D1D5DB"><path d="M6 1l1.4 2.8 3.1.5-2.2 2.2.5 3.1L6 8.2 3.2 9.6l.5-3.1L1.5 4.3l3.1-.5L6 1z"/></svg>';
            }
        }
        return html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function scrollToTop() {
        var el = document.getElementById('tb-rental-results');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ── Boot ──────────────────────────────────── */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { TB.RentalResults.init(); });
    } else {
        TB.RentalResults.init();
    }
})();
