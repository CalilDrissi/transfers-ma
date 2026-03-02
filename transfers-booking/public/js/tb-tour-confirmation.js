/**
 * Tour confirmation page — displays booking details from URL params.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n;

    TB.TourConfirmation = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};

            var params = this.parseParams();
            if (!params.ref) {
                this.showError(i18n.bookingNotFound || 'No booking reference provided.');
                return;
            }

            this.hideLoading();
            this.renderBooking(params);
            this.initCopyRef();
            this.initPrint();
        },

        parseParams: function () {
            var sp = new URLSearchParams(window.location.search);
            return {
                ref: sp.get('ref') || '',
                trip_name: sp.get('trip_name') || '',
                date: sp.get('date') || '',
                adults: parseInt(sp.get('adults'), 10) || 1,
                children: parseInt(sp.get('children'), 10) || 0,
                is_private: sp.get('is_private') === '1',
                total: parseFloat(sp.get('total')) || 0,
                currency: sp.get('currency') || cfg.currencySymbol || 'MAD',
                gateway: sp.get('gateway') || ''
            };
        },

        hideLoading: function () {
            var el = document.getElementById('tb-tour-confirmation-loading');
            if (el) el.style.display = 'none';
        },

        showError: function (msg) {
            this.hideLoading();
            var el = document.getElementById('tb-tour-confirmation-error');
            if (el) el.style.display = 'block';
            var msgEl = document.getElementById('tb-tour-confirmation-error-msg');
            if (msgEl && msg) msgEl.textContent = msg;
        },

        /* ── Render booking ───────────────────── */

        renderBooking: function (params) {
            var content = document.getElementById('tb-tour-confirmation-content');
            if (content) content.style.display = 'block';

            var currency = params.currency;

            // Booking ref
            setText('tb-tour-confirmation-ref', params.ref);

            // Tour details
            setText('tb-tour-confirmation-name', params.trip_name);
            setText('tb-tour-confirmation-date', formatDate(params.date));

            var paxText = params.adults + ' ' + (i18n.adults || 'Adults');
            if (params.children > 0) {
                paxText += ', ' + params.children + ' ' + (i18n.children || 'Children');
            }
            setText('tb-tour-confirmation-pax', paxText);

            // Private tour
            if (params.is_private) {
                var privateRow = document.getElementById('tb-tour-confirmation-private-row');
                if (privateRow) privateRow.style.display = 'flex';
            }

            // Pricing
            setText('tb-tour-confirmation-total', formatPrice(params.total, currency));

            // Gateway
            var gatewayNames = { stripe: 'Credit Card', paypal: 'PayPal', cash: 'Cash' };
            setText('tb-tour-confirmation-gateway', gatewayNames[params.gateway] || params.gateway || '--');
        },

        /* ── Copy reference ───────────────────── */

        initCopyRef: function () {
            var refEl = document.getElementById('tb-tour-confirmation-ref');
            var copiedEl = document.getElementById('tb-tour-confirmation-copied');

            if (refEl) {
                refEl.addEventListener('click', function () {
                    var text = refEl.textContent;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(text).then(function () {
                            if (copiedEl) {
                                copiedEl.style.opacity = '1';
                                setTimeout(function () { copiedEl.style.opacity = '0'; }, 2000);
                            }
                        });
                    }
                });
            }
        },

        /* ── Print ────────────────────────────── */

        initPrint: function () {
            var printBtn = document.getElementById('tb-tour-confirmation-print');
            if (printBtn) {
                printBtn.addEventListener('click', function () {
                    window.print();
                });
            }
        }
    };

    /* ── Helpers ───────────────────────────────── */

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text || '--';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '--';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatPrice(amount, currency) {
        currency = currency || (cfg && cfg.currencySymbol) || 'MAD';
        var position = (cfg && cfg.currencyPosition) || 'after';
        var num = Math.round(parseFloat(amount));
        if (isNaN(num)) return '--';
        if (position === 'before') return currency + ' ' + num;
        return num + ' ' + currency;
    }

    /* ── Boot ──────────────────────────────────── */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { TB.TourConfirmation.init(); });
    } else {
        TB.TourConfirmation.init();
    }
})();
