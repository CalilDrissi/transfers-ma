/**
 * Confirmation page — displays booking details after payment.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n;

    TB.Confirmation = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};

            var ref = this.getRef();
            if (!ref) {
                this.showError(i18n.bookingNotFound || 'No booking reference provided.');
                return;
            }

            this.loadBooking(ref);
            this.initCopyRef();
            this.initPrint();
        },

        getRef: function () {
            return new URLSearchParams(window.location.search).get('ref') || '';
        },

        /* ── Load booking ─────────────────────── */

        loadBooking: function (ref) {
            var self = this;

            TB.API._call('get_booking_by_ref', { _path_suffix: ref }).then(function (data) {
                self.hideLoading();
                self.renderBooking(data);
            }).catch(function (err) {
                self.hideLoading();
                self.showError(err.message || (i18n.bookingNotFound || 'Booking not found.'));
            });
        },

        hideLoading: function () {
            var el = document.getElementById('tb-confirmation-loading');
            if (el) el.style.display = 'none';
        },

        showError: function (msg) {
            this.hideLoading();
            var el = document.getElementById('tb-confirmation-error');
            if (el) el.style.display = 'block';
            var msgEl = document.getElementById('tb-confirmation-error-msg');
            if (msgEl && msg) msgEl.textContent = msg;
        },

        /* ── Render booking ───────────────────── */

        renderBooking: function (booking) {
            var content = document.getElementById('tb-confirmation-content');
            if (content) content.style.display = 'block';

            var currency = booking.currency || cfg.currencySymbol || 'MAD';

            // Booking ref
            setText('tb-confirmation-ref', booking.booking_ref || '--');

            // Route
            var route = '';
            if (booking.pickup_address && booking.dropoff_address) {
                route = shortName(booking.pickup_address) + ' → ' + shortName(booking.dropoff_address);
            } else if (booking.trip && booking.trip.name) {
                route = booking.trip.name;
            }
            setText('tb-confirmation-route', route);

            // Date
            setText('tb-confirmation-date', formatDateTime(booking.pickup_datetime || booking.trip_date));

            // Return
            if (booking.is_round_trip && booking.return_datetime) {
                var returnRow = document.getElementById('tb-confirmation-return-row');
                if (returnRow) returnRow.style.display = '';
                setText('tb-confirmation-return', formatDateTime(booking.return_datetime));
            }

            // Vehicle
            var vehicle = booking.vehicle_category || booking.vehicle_category_name || '--';
            setText('tb-confirmation-vehicle', vehicle);

            // Passengers & luggage
            setText('tb-confirmation-passengers', (booking.passengers || booking.adults || 0) + ' ' + (i18n.passengersLabel || 'passengers'));
            setText('tb-confirmation-luggage', (booking.luggage || 0) + ' ' + (i18n.bagsLabel || 'bags'));

            // Payment
            var totalPrice = parseFloat(booking.total_price) || 0;
            var depositAmount = parseFloat(booking.deposit_amount) || 0;
            var discount = parseFloat(booking.discount) || 0;

            setText('tb-confirmation-total', formatPrice(totalPrice, currency));

            if (depositAmount > 0 && depositAmount < totalPrice) {
                setText('tb-confirmation-paid', formatPrice(depositAmount, currency));
                var dueRow = document.getElementById('tb-confirmation-due-row');
                if (dueRow) dueRow.style.display = '';
                setText('tb-confirmation-due', formatPrice(totalPrice - depositAmount, currency));
            } else {
                setText('tb-confirmation-paid', formatPrice(totalPrice, currency));
            }

            if (discount > 0) {
                var discRow = document.getElementById('tb-confirmation-discount-row');
                if (discRow) discRow.style.display = '';
                setText('tb-confirmation-discount', '-' + formatPrice(discount, currency));
            }
        },

        /* ── Copy ref ─────────────────────────── */

        initCopyRef: function () {
            var refEl = document.getElementById('tb-confirmation-ref');
            var copiedEl = document.getElementById('tb-confirmation-copied');
            if (!refEl) return;

            refEl.addEventListener('click', function () {
                var text = refEl.textContent;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function () {
                        showCopied();
                    });
                } else {
                    // Fallback
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.cssText = 'position:fixed;opacity:0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    showCopied();
                }
            });

            function showCopied() {
                if (copiedEl) {
                    copiedEl.classList.add('tb-confirmation__ref-copied--visible');
                    setTimeout(function () {
                        copiedEl.classList.remove('tb-confirmation__ref-copied--visible');
                    }, 2000);
                }
            }
        },

        /* ── Print ────────────────────────────── */

        initPrint: function () {
            var printBtn = document.getElementById('tb-confirmation-print');
            if (printBtn) {
                printBtn.addEventListener('click', function () {
                    window.print();
                });
            }
        }
    };

    /* ── Helpers ──────────────────────────────── */

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function shortName(name) {
        if (!name) return '--';
        return name.split(',')[0].trim();
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

    function formatPrice(amount, currency) {
        var num = Math.round(parseFloat(amount));
        if (isNaN(num)) return '--';
        var cfg2 = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        var pos = cfg2.currencyPosition || 'after';
        if (pos === 'before') return currency + ' ' + num;
        return num + ' ' + currency;
    }

    /* ── Boot ─────────────────────────────────── */

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('tb-confirmation')) {
            TB.Confirmation.init();
        }
    });

})();
