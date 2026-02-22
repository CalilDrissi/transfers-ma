/**
 * Wizard controller. Manages step navigation, progress bar, and multi-city leg progression.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    TB.Wizard = {

        currentStep: 1,

        init: function () {
            TB.State.set('step', 1);
            this.currentStep = 1;
            this.showStep(1);
            TB.Step1.init();

            var bookAnother = document.getElementById('tb-book-another');
            if (bookAnother) {
                bookAnother.addEventListener('click', function () {
                    TB.Wizard.resetAndRestart();
                });
            }
        },

        showStep: function (step) {
            var steps = document.querySelectorAll('.tb-step');
            for (var i = 0; i < steps.length; i++) {
                steps[i].classList.remove('tb-step--active');
            }
            var target = document.getElementById('tb-step-' + step);
            if (target) target.classList.add('tb-step--active');

            this.updateProgress(step);
            this.currentStep = step;
            TB.State.set('step', step);

            if (step === 2) TB.Step2.init();
            if (step === 3) TB.Step3.init();

            var widget = document.getElementById('tb-booking-widget');
            if (widget) widget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

        updateProgress: function (step) {
            var progressSteps = document.querySelectorAll('.tb-progress__step');
            for (var i = 0; i < progressSteps.length; i++) {
                var stepNum = parseInt(progressSteps[i].getAttribute('data-step'));
                progressSteps[i].classList.remove('tb-progress__step--active', 'tb-progress__step--completed');
                if (stepNum === step) progressSteps[i].classList.add('tb-progress__step--active');
                else if (stepNum < step) progressSteps[i].classList.add('tb-progress__step--completed');
            }
            // Multi-city progress indicator
            var multiProgress = document.getElementById('tb-multi-progress');
            if (multiProgress) {
                var mode = TB.State.get('mode');
                if (mode === 'multi-city' && step > 1) {
                    var legs = TB.State.get('legs') || [];
                    var currentIdx = TB.State.get('currentLegIndex') || 0;
                    var text = (tbConfig.i18n.transferOf || 'Transfer {current} of {total}')
                        .replace('{current}', currentIdx + 1)
                        .replace('{total}', legs.length);
                    multiProgress.textContent = text;
                    multiProgress.style.display = 'block';
                } else {
                    multiProgress.style.display = 'none';
                }
            }
        },

        showConfirmation: function () {
            var steps = document.querySelectorAll('.tb-step');
            for (var i = 0; i < steps.length; i++) steps[i].classList.remove('tb-step--active');
            var confirmEl = document.getElementById('tb-confirmation');
            if (confirmEl) confirmEl.classList.add('tb-step--active');
            var progressSteps = document.querySelectorAll('.tb-progress__step');
            for (var j = 0; j < progressSteps.length; j++) {
                progressSteps[j].classList.remove('tb-progress__step--active');
                progressSteps[j].classList.add('tb-progress__step--completed');
            }
            var multiProgress = document.getElementById('tb-multi-progress');
            if (multiProgress) multiProgress.style.display = 'none';
            var widget = document.getElementById('tb-booking-widget');
            if (widget) widget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

        onLegComplete: function () {
            var mode = TB.State.get('mode');
            var currentIdx = TB.State.get('currentLegIndex') || 0;
            var legs = TB.State.get('legs') || [];

            TB.State.saveFlatToLeg(currentIdx);
            TB.State.save();

            if (mode === 'multi-city' && currentIdx < legs.length - 1) {
                var nextIdx = currentIdx + 1;
                TB.State.set('currentLegIndex', nextIdx);
                TB.State.syncLegToFlat(nextIdx);
                TB.State.set('selectedVehicle', null);
                TB.State.set('selectedExtras', []);
                TB.State.set('quoteData', null);
                TB.State.save();
                this.showStep(2);
            } else if (mode === 'multi-city') {
                this.showMultiCityConfirmation();
            } else {
                var refEl = document.getElementById('tb-confirmation-ref');
                var emailEl = document.getElementById('tb-confirmation-email');
                if (refEl) refEl.textContent = TB.State.get('bookingRef');
                if (emailEl) emailEl.textContent = TB.State.get('customerEmail');
                this.showConfirmation();
            }
        },

        showMultiCityConfirmation: function () {
            var legs = TB.State.get('legs') || [];
            var refs = [];
            for (var i = 0; i < legs.length; i++) {
                if (legs[i].bookingRef) refs.push(legs[i].bookingRef);
            }
            var refEl = document.getElementById('tb-confirmation-ref');
            var emailEl = document.getElementById('tb-confirmation-email');
            if (refEl) refEl.textContent = refs.join(', ');
            if (emailEl) emailEl.textContent = TB.State.get('customerEmail');
            this.showConfirmation();
        },

        resetAndRestart: function () {
            TB.State.reset();

            var inputs = document.querySelectorAll('#tb-booking-widget input, #tb-booking-widget select, #tb-booking-widget textarea');
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].type === 'checkbox') inputs[i].checked = false;
                else if (inputs[i].type === 'number') inputs[i].value = inputs[i].getAttribute('value') || '1';
                else if (inputs[i].tagName === 'SELECT') inputs[i].selectedIndex = 0;
                else inputs[i].value = '';
            }

            // Clear multi-city state
            var legsContainer = document.getElementById('tb-legs-container');
            if (legsContainer) legsContainer.innerHTML = '';
            var returnCheck = document.getElementById('tb-return-to-start-check');
            if (returnCheck) returnCheck.checked = false;
            var returnToggle = document.getElementById('tb-return-to-start');
            if (returnToggle) returnToggle.style.display = 'none';
            var flightBar = document.getElementById('tb-flight-bar');
            if (flightBar) flightBar.style.display = 'none';
            var multiProgress = document.getElementById('tb-multi-progress');
            if (multiProgress) multiProgress.style.display = 'none';

            // Reset mode tabs to one-way
            var tabs = document.querySelectorAll('.tb-mode-tab');
            for (var t = 0; t < tabs.length; t++) {
                tabs[t].classList.toggle('tb-mode-tab--active', tabs[t].getAttribute('data-mode') === 'one-way');
            }
            var singleBar = document.getElementById('tb-single-bar');
            if (singleBar) singleBar.style.display = 'block';
            var multiBar = document.getElementById('tb-multi-bar');
            if (multiBar) multiBar.style.display = 'none';

            // Reset pax/luggage display
            var paxCount = document.getElementById('tb-pax-count');
            var lugCount = document.getElementById('tb-luggage-count');
            if (paxCount) paxCount.textContent = '1';
            if (lugCount) lugCount.textContent = '1';
            var pillText = document.getElementById('tb-pax-pill-text');
            if (pillText) pillText.textContent = '1 pax, 1 bag';
            var pillTextMulti = document.getElementById('tb-pax-pill-text-multi');
            if (pillTextMulti) pillTextMulti.textContent = '1 pax, 1 bag';

            this.showStep(1);
            TB.Step1.init();
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('tb-booking-widget')) {
            TB.Wizard.init();
        }
    });
})();
