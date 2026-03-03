/**
 * Custom Fields module — fetches admin-defined field definitions from the API,
 * renders them into checkout forms, validates required fields, and collects values.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var fields = [];
    var containerId = '';

    TB.CustomFields = {

        /**
         * Fetch field definitions and render into the container.
         * @param {string} appliesTo - 'transfer' or 'trip'
         * @param {string} cId - DOM id of the container div
         * @param {string} cardId - DOM id of the wrapper card (shown when fields exist)
         */
        init: function (appliesTo, cId, cardId) {
            containerId = cId;
            var container = document.getElementById(cId);
            if (!container) return;

            TB.API._call('get_custom_fields', { applies_to: appliesTo }).then(function (data) {
                fields = data || [];
                if (fields.length === 0) return;

                var card = document.getElementById(cardId);
                if (card) card.style.display = '';

                container.innerHTML = '';
                for (var i = 0; i < fields.length; i++) {
                    container.appendChild(renderField(fields[i]));
                }
            }).catch(function () {
                // Silently fail — custom fields are optional
            });
        },

        /**
         * Collect all custom field values.
         * @returns {Object} { field_name: value, ... }
         */
        getValues: function () {
            var values = {};
            for (var i = 0; i < fields.length; i++) {
                var f = fields[i];
                var el = document.getElementById('tb-cf-' + f.name);
                if (!el) continue;

                if (f.field_type === 'checkbox') {
                    values[f.name] = el.checked;
                } else {
                    var val = el.value.trim();
                    if (val) values[f.name] = val;
                }
            }
            return values;
        },

        /**
         * Validate required fields. Shows error styling on invalid fields.
         * @returns {boolean} true if all required fields are valid
         */
        validate: function () {
            var valid = true;
            for (var i = 0; i < fields.length; i++) {
                var f = fields[i];
                if (!f.is_required) continue;

                var el = document.getElementById('tb-cf-' + f.name);
                if (!el) continue;

                var isEmpty = false;
                if (f.field_type === 'checkbox') {
                    isEmpty = !el.checked;
                } else {
                    isEmpty = !el.value.trim();
                }

                if (isEmpty) {
                    el.classList.add('tb-tour-checkout__input--error');
                    if (valid) el.focus();
                    valid = false;
                } else {
                    el.classList.remove('tb-tour-checkout__input--error');
                }
            }
            return valid;
        }
    };

    /* ── Render helpers ─────────────────────── */

    function renderField(f) {
        var wrapper = document.createElement('div');
        wrapper.className = 'tb-tour-checkout__field';

        if (f.field_type === 'checkbox') {
            // Checkbox gets label inline
            var label = document.createElement('label');
            label.className = 'tb-tour-checkout__checkbox-label';
            label.setAttribute('for', 'tb-cf-' + f.name);

            var input = document.createElement('input');
            input.type = 'checkbox';
            input.id = 'tb-cf-' + f.name;
            input.className = 'tb-tour-checkout__checkbox';

            var span = document.createElement('span');
            span.textContent = f.label + (f.is_required ? ' *' : '');

            label.appendChild(input);
            label.appendChild(span);
            wrapper.appendChild(label);
        } else {
            // Label
            var lbl = document.createElement('label');
            lbl.className = 'tb-tour-checkout__label';
            lbl.setAttribute('for', 'tb-cf-' + f.name);
            lbl.textContent = f.label + (f.is_required ? ' *' : '');
            wrapper.appendChild(lbl);

            // Input
            var inputEl;
            if (f.field_type === 'textarea') {
                inputEl = document.createElement('textarea');
                inputEl.className = 'tb-tour-checkout__textarea';
                inputEl.rows = 3;
            } else if (f.field_type === 'select') {
                inputEl = document.createElement('select');
                inputEl.className = 'tb-tour-checkout__input';
                var emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.textContent = f.placeholder || '-- Select --';
                inputEl.appendChild(emptyOpt);
                var opts = f.options || [];
                for (var j = 0; j < opts.length; j++) {
                    var opt = document.createElement('option');
                    opt.value = opts[j];
                    opt.textContent = opts[j];
                    inputEl.appendChild(opt);
                }
            } else {
                inputEl = document.createElement('input');
                inputEl.className = 'tb-tour-checkout__input';
                inputEl.type = f.field_type || 'text';
            }

            inputEl.id = 'tb-cf-' + f.name;
            if (f.placeholder && f.field_type !== 'select') {
                inputEl.placeholder = f.placeholder;
            }

            // Clear error on input
            inputEl.addEventListener('input', function () {
                this.classList.remove('tb-tour-checkout__input--error');
            });

            wrapper.appendChild(inputEl);
        }

        // Help text
        if (f.help_text_field) {
            var help = document.createElement('small');
            help.className = 'tb-tour-checkout__field-help';
            help.textContent = f.help_text_field;
            wrapper.appendChild(help);
        }

        return wrapper;
    }

})();
