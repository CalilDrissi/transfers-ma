/**
 * Shared utility functions.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    TB.Utils = {

        formatPrice: function (amount, currency, position) {
            currency = currency || (TB.State && TB.State.get('currency')) || tbConfig.currencySymbol;
            position = position || tbConfig.currencyPosition;
            var num = Math.round(parseFloat(amount));
            if (isNaN(num)) return '--';
            if (position === 'before') {
                return currency + ' ' + num;
            }
            return num + ' ' + currency;
        },

        formatDate: function (dateStr) {
            if (!dateStr) return '--';
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        },

        formatDateTime: function (dateStr) {
            if (!dateStr) return '--';
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            }) + ' ' + d.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        },

        formatDuration: function (minutes) {
            if (!minutes) return '--';
            var h = Math.floor(minutes / 60);
            var m = minutes % 60;
            if (h > 0 && m > 0) return h + 'h ' + m + 'min';
            if (h > 0) return h + 'h';
            return m + ' min';
        },

        shortName: function (name) {
            if (!name) return '--';
            // Take first meaningful part
            var parts = name.split(',');
            return parts[0].trim();
        },

        validateEmail: function (email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },

        validatePhone: function (phone) {
            // At least 8 digits, allow +, spaces, dashes
            return /^[\+]?[\d\s\-()]{8,}$/.test(phone);
        },

        escapeHtml: function (str) {
            if (!str) return '';
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        },

        showFieldError: function (field, message) {
            var el = document.querySelector('.tb-field-error[data-field="' + field + '"]');
            if (el) {
                el.textContent = message;
            }
            // Also mark input as error
            var input = el ? el.previousElementSibling : null;
            if (input && input.classList) {
                input.classList.add('tb-input--error');
            }
        },

        clearFieldErrors: function () {
            var errors = document.querySelectorAll('.tb-field-error');
            for (var i = 0; i < errors.length; i++) {
                errors[i].textContent = '';
            }
            var inputs = document.querySelectorAll('.tb-input--error');
            for (var j = 0; j < inputs.length; j++) {
                inputs[j].classList.remove('tb-input--error');
            }
        },

        showAlert: function (containerId, message) {
            var el = document.getElementById(containerId);
            if (el) {
                if (typeof message !== 'string') {
                    message = (message && typeof message.message === 'string') ? message.message
                        : (message && typeof message.error === 'string') ? message.error
                        : (message && typeof message.detail === 'string') ? message.detail
                        : tbConfig.i18n.errorGeneric || 'An error occurred.';
                }
                el.textContent = message;
                el.style.display = 'block';
            }
        },

        hideAlert: function (containerId) {
            var el = document.getElementById(containerId);
            if (el) {
                el.style.display = 'none';
            }
        },

        setButtonLoading: function (btn, loading) {
            if (!btn) return;
            if (loading) {
                btn._origText = btn.textContent;
                btn.innerHTML = '<span class="tb-spinner"></span> ' + tbConfig.i18n.processing;
                btn.classList.add('tb-btn--loading');
                btn.disabled = true;
            } else {
                btn.textContent = btn._origText || '';
                btn.classList.remove('tb-btn--loading');
                btn.disabled = false;
            }
        }
    };
})();
