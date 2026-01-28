/**
 * Wizard controller. Manages step navigation and progress bar.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    TB.Wizard = {

        currentStep: 1,

        init: function () {
            // Always start fresh at step 1 (don't resume mid-flow from localStorage
            // since pricing/vehicles may have changed)
            TB.State.set('step', 1);
            this.currentStep = 1;
            this.showStep(1);

            // Initialize step 1
            TB.Step1.init();

            // Book another button
            var bookAnother = document.getElementById('tb-book-another');
            if (bookAnother) {
                bookAnother.addEventListener('click', function () {
                    TB.Wizard.resetAndRestart();
                });
            }
        },

        showStep: function (step) {
            // Hide all steps
            var steps = document.querySelectorAll('.tb-step');
            for (var i = 0; i < steps.length; i++) {
                steps[i].classList.remove('tb-step--active');
            }

            // Show target step
            var target = document.getElementById('tb-step-' + step);
            if (target) {
                target.classList.add('tb-step--active');
            }

            // Update progress bar
            this.updateProgress(step);
            this.currentStep = step;
            TB.State.set('step', step);

            // Init step-specific logic
            if (step === 2) TB.Step2.init();
            if (step === 3) TB.Step3.init();

            // Scroll to top of widget
            var widget = document.getElementById('tb-booking-widget');
            if (widget) {
                widget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        updateProgress: function (step) {
            var progressSteps = document.querySelectorAll('.tb-progress__step');
            for (var i = 0; i < progressSteps.length; i++) {
                var stepNum = parseInt(progressSteps[i].getAttribute('data-step'));
                progressSteps[i].classList.remove('tb-progress__step--active', 'tb-progress__step--completed');

                if (stepNum === step) {
                    progressSteps[i].classList.add('tb-progress__step--active');
                } else if (stepNum < step) {
                    progressSteps[i].classList.add('tb-progress__step--completed');
                }
            }
        },

        showConfirmation: function () {
            // Hide all steps
            var steps = document.querySelectorAll('.tb-step');
            for (var i = 0; i < steps.length; i++) {
                steps[i].classList.remove('tb-step--active');
            }

            // Show confirmation
            var confirm = document.getElementById('tb-confirmation');
            if (confirm) {
                confirm.classList.add('tb-step--active');
            }

            // Mark all progress steps as completed
            var progressSteps = document.querySelectorAll('.tb-progress__step');
            for (var j = 0; j < progressSteps.length; j++) {
                progressSteps[j].classList.remove('tb-progress__step--active');
                progressSteps[j].classList.add('tb-progress__step--completed');
            }

            // Scroll to top
            var widget = document.getElementById('tb-booking-widget');
            if (widget) {
                widget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        resetAndRestart: function () {
            TB.State.reset();

            // Clear form inputs
            var inputs = document.querySelectorAll('#tb-booking-widget input, #tb-booking-widget select, #tb-booking-widget textarea');
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].type === 'checkbox') {
                    inputs[i].checked = false;
                } else if (inputs[i].type === 'number') {
                    inputs[i].value = inputs[i].getAttribute('value') || '1';
                } else if (inputs[i].tagName === 'SELECT') {
                    inputs[i].selectedIndex = 0;
                } else {
                    inputs[i].value = '';
                }
            }

            // Hide conditional fields
            var returnGroup = document.getElementById('tb-return-datetime-group');
            if (returnGroup) returnGroup.style.display = 'none';

            var flightGroup = document.getElementById('tb-flight-group');
            if (flightGroup) flightGroup.style.display = 'none';

            this.showStep(1);
            TB.Step1.init();
        }
    };

    // Bootstrap on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('tb-booking-widget')) {
            TB.Wizard.init();
        }
    });
})();
