/**
 * Rental confirmation page — displays booking details after payment.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n;

    TB.RentalConfirmation = {

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

            TB.API._call('rental_by_ref', { _path_suffix: ref }).then(function (data) {
                self.hideLoading();
                self.renderBooking(data);
            }).catch(function (err) {
                self.hideLoading();
                self.showError(err.message || (i18n.bookingNotFound || 'Booking not found.'));
            });
        },

        hideLoading: function () {
            var el = document.getElementById('tb-rental-confirmation-loading');
            if (el) el.style.display = 'none';
        },

        showError: function (msg) {
            this.hideLoading();
            var el = document.getElementById('tb-rental-confirmation-error');
            if (el) el.style.display = 'block';
            var msgEl = document.getElementById('tb-rental-confirmation-error-msg');
            if (msgEl && msg) msgEl.textContent = msg;
        },

        /* ── Render booking ───────────────────── */

        renderBooking: function (booking) {
            var content = document.getElementById('tb-rental-confirmation-content');
            if (content) content.style.display = 'block';

            var currency = booking.currency || cfg.currencySymbol || 'MAD';

            // Booking ref
            setText('tb-rental-confirmation-ref', booking.booking_ref || booking.reference || '--');

            // Vehicle details
            setText('tb-rental-confirmation-vehicle', booking.vehicle_name || (booking.vehicle && booking.vehicle.name) || '--');
            setText('tb-rental-confirmation-company', booking.company_name || (booking.company && booking.company.name) || '--');
            setText('tb-rental-confirmation-city', booking.city_name || booking.city || '--');

            // Dates
            setText('tb-rental-confirmation-pickup-date', formatDate(booking.pickup_date));
            setText('tb-rental-confirmation-return-date', formatDate(booking.return_date));

            var days = calcDays(booking.pickup_date, booking.return_date);
            setText('tb-rental-confirmation-duration', days + ' ' + (days === 1 ? (i18n.day || 'day') : (i18n.days || 'days')));

            // Pricing
            setText('tb-rental-confirmation-rental-cost', formatPrice(booking.rental_cost || booking.base_price || 0, currency));

            // Insurance
            if (booking.insurance_cost && booking.insurance_cost > 0) {
                var insRow = document.getElementById('tb-rental-confirmation-insurance-row');
                if (insRow) insRow.style.display = 'flex';
                setText('tb-rental-confirmation-insurance', formatPrice(booking.insurance_cost, currency));
            }

            // Extras
            if (booking.extras_cost && booking.extras_cost > 0) {
                var extRow = document.getElementById('tb-rental-confirmation-extras-row');
                if (extRow) extRow.style.display = 'flex';
                setText('tb-rental-confirmation-extras', formatPrice(booking.extras_cost, currency));
            }

            // Discount
            if (booking.discount_amount && booking.discount_amount > 0) {
                var discRow = document.getElementById('tb-rental-confirmation-discount-row');
                if (discRow) discRow.style.display = 'flex';
                setText('tb-rental-confirmation-discount', '-' + formatPrice(booking.discount_amount, currency));
            }

            // Total
            setText('tb-rental-confirmation-total', formatPrice(booking.total_price || booking.total || 0, currency));

            // Company contact
            var contactDetails = document.getElementById('tb-rental-confirmation-contact-details');
            if (contactDetails && booking.company) {
                var html = '';
                if (booking.company.phone) {
                    html += '<p><strong>' + escapeHtml(i18n.phone || 'Phone') + ':</strong> ' +
                        '<a href="tel:' + escapeHtml(booking.company.phone) + '">' + escapeHtml(booking.company.phone) + '</a></p>';
                }
                if (booking.company.email) {
                    html += '<p><strong>' + escapeHtml(i18n.email || 'Email') + ':</strong> ' +
                        '<a href="mailto:' + escapeHtml(booking.company.email) + '">' + escapeHtml(booking.company.email) + '</a></p>';
                }
                if (booking.company.address) {
                    html += '<p><strong>' + escapeHtml(i18n.address || 'Address') + ':</strong> ' + escapeHtml(booking.company.address) + '</p>';
                }
                if (booking.company.whatsapp) {
                    html += '<p><a href="https://wa.me/' + escapeHtml(booking.company.whatsapp.replace(/[^0-9]/g, '')) + '" target="_blank" rel="noopener">' +
                        escapeHtml(i18n.whatsapp || 'Contact via WhatsApp') + '</a></p>';
                }
                contactDetails.innerHTML = html;
            }
        },

        /* ── Copy reference ───────────────────── */

        initCopyRef: function () {
            var refEl = document.getElementById('tb-rental-confirmation-ref');
            var copiedEl = document.getElementById('tb-rental-confirmation-copied');

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
            var printBtn = document.getElementById('tb-rental-confirmation-print');
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

    function calcDays(pickup, ret) {
        if (!pickup || !ret) return 1;
        var d1 = new Date(pickup);
        var d2 = new Date(ret);
        var diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /* ── Boot ──────────────────────────────────── */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { TB.RentalConfirmation.init(); });
    } else {
        TB.RentalConfirmation.init();
    }
})();
