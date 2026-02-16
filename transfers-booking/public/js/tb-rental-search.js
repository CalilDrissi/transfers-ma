/**
 * Rental search widget — city selection, date pickers, search.
 */
(function () {
    'use strict';

    var cfg, i18n;

    function init() {
        cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        i18n = cfg.i18n || {};

        loadCities();
        initDatePickers();
        initForm();
    }

    /* ── Load cities from API ─────────────────── */

    function loadCities() {
        var select = document.getElementById('tb-rental-city');
        if (!select) return;

        var formData = new FormData();
        formData.append('action', 'tb_api_proxy');
        formData.append('nonce', cfg.nonce);
        formData.append('endpoint', 'rental_cities');
        formData.append('params', JSON.stringify({}));

        fetch(cfg.ajaxUrl, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
        .then(function (res) { return res.json(); })
        .then(function (result) {
            if (result.success && Array.isArray(result.data)) {
                select.innerHTML = '<option value="">' + escapeHtml(i18n.selectCity || 'Select a city') + '</option>';
                result.data.forEach(function (city) {
                    var opt = document.createElement('option');
                    opt.value = city.slug || city.id || city.name;
                    opt.textContent = city.name;
                    select.appendChild(opt);
                });
            } else {
                select.innerHTML = '<option value="">' + escapeHtml(i18n.errorGeneric || 'Error loading cities') + '</option>';
            }
        })
        .catch(function () {
            select.innerHTML = '<option value="">' + escapeHtml(i18n.errorGeneric || 'Error loading cities') + '</option>';
        });
    }

    /* ── Date pickers ─────────────────────────── */

    function initDatePickers() {
        var pickupInput = document.getElementById('tb-rental-pickup-date');
        var returnInput = document.getElementById('tb-rental-return-date');

        if (!pickupInput || !returnInput) return;

        // Set min date to today
        var today = new Date();
        var todayStr = formatDateInput(today);
        pickupInput.setAttribute('min', todayStr);
        returnInput.setAttribute('min', todayStr);

        // Default pickup = tomorrow, return = day after
        var tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        if (!pickupInput.value) pickupInput.value = formatDateInput(tomorrow);
        if (!returnInput.value) returnInput.value = formatDateInput(dayAfter);

        // Update return min when pickup changes
        pickupInput.addEventListener('change', function () {
            var pickupDate = new Date(pickupInput.value);
            var nextDay = new Date(pickupDate);
            nextDay.setDate(nextDay.getDate() + 1);
            returnInput.setAttribute('min', formatDateInput(nextDay));

            if (new Date(returnInput.value) <= pickupDate) {
                returnInput.value = formatDateInput(nextDay);
            }
        });

        // Use Flatpickr if available
        if (typeof flatpickr !== 'undefined') {
            flatpickr(pickupInput, {
                minDate: 'today',
                dateFormat: 'Y-m-d',
                onChange: function (selectedDates) {
                    if (selectedDates[0]) {
                        var nextDay = new Date(selectedDates[0]);
                        nextDay.setDate(nextDay.getDate() + 1);
                        returnPicker.set('minDate', nextDay);
                        if (returnInput._flatpickr && new Date(returnInput.value) <= selectedDates[0]) {
                            returnPicker.setDate(nextDay);
                        }
                    }
                }
            });
            var returnPicker = flatpickr(returnInput, {
                minDate: 'today',
                dateFormat: 'Y-m-d'
            });
        }
    }

    /* ── Form submission ──────────────────────── */

    function initForm() {
        var form = document.getElementById('tb-rental-search-form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError();

            var city = document.getElementById('tb-rental-city').value;
            var pickupDate = document.getElementById('tb-rental-pickup-date').value;
            var returnDate = document.getElementById('tb-rental-return-date').value;
            var category = document.getElementById('tb-rental-category').value;

            // Validation
            if (!city) {
                showError(i18n.selectCity || 'Please select a city.');
                return;
            }
            if (!pickupDate) {
                showError(i18n.selectDatetime || 'Please select a pickup date.');
                return;
            }
            if (!returnDate) {
                showError(i18n.returnDateRequired || 'Please select a return date.');
                return;
            }

            var pickup = new Date(pickupDate);
            var ret = new Date(returnDate);
            var now = new Date();
            now.setHours(0, 0, 0, 0);

            if (pickup < now) {
                showError(i18n.pickupFuture || 'Pickup date must be in the future.');
                return;
            }
            if (ret <= pickup) {
                showError(i18n.returnAfterPickup || 'Return date must be after pickup date.');
                return;
            }

            // Build URL and redirect
            var resultsUrl = cfg.rentalResultsPageUrl || '/rental-results/';
            var params = new URLSearchParams();
            params.set('city', city);
            // Also pass city display name
            var citySelect = document.getElementById('tb-rental-city');
            var cityName = citySelect.options[citySelect.selectedIndex].textContent;
            params.set('city_name', cityName);
            params.set('pickup_date', pickupDate);
            params.set('return_date', returnDate);
            if (category) params.set('category', category);

            window.location.href = resultsUrl + '?' + params.toString();
        });
    }

    /* ── Helpers ───────────────────────────────── */

    function showError(msg) {
        var el = document.getElementById('tb-rental-search-error');
        if (el) {
            el.textContent = msg;
            el.style.display = 'block';
        }
    }

    function hideError() {
        var el = document.getElementById('tb-rental-search-error');
        if (el) el.style.display = 'none';
    }

    function formatDateInput(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /* ── Boot ──────────────────────────────────── */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
