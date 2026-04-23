<?php defined('ABSPATH') || exit; ?>

<!-- Checkout Progress -->
<div class="tb-checkout-progress">
    <div class="tb-checkout-progress__step tb-checkout-progress__step--done"><?php esc_html_e('Ride Type', 'transfers-booking'); ?></div>
    <div class="tb-checkout-progress__step tb-checkout-progress__step--active"><?php esc_html_e('Booking Details', 'transfers-booking'); ?></div>
    <div class="tb-checkout-progress__step tb-checkout-progress__step--upcoming"><?php esc_html_e('Checkout', 'transfers-booking'); ?></div>
</div>

<div class="tb-step3-layout">
    <div class="tb-step3-main">
        <!-- Back Button -->
        <button type="button" class="tb-btn-back" data-back="2">
            &larr; <?php esc_html_e('Back to vehicle', 'transfers-booking'); ?>
        </button>

        <!-- Transfer Details Card -->
        <div class="tb-card">
            <h4 class="tb-card__title"><?php esc_html_e('Transfer Details', 'transfers-booking'); ?></h4>
            <!-- Mini Map -->
            <div id="tb-checkout-map" class="tb-checkout-map"></div>
            <div class="tb-checkout-location">
                <span class="tb-checkout-location__dot tb-checkout-location__dot--pickup"></span>
                <span class="tb-checkout-location__text" id="tb-checkout-pickup-display">--</span>
            </div>
            <div class="tb-form-group" id="tb-checkout-flight-group" style="display:none;">
                <label class="tb-label"><?php esc_html_e('Flight Number', 'transfers-booking'); ?></label>
                <input type="text" id="tb-checkout-flight" class="tb-input" placeholder="<?php esc_attr_e('e.g. AT 1234', 'transfers-booking'); ?>">
            </div>
            <div class="tb-checkout-row">
                <div class="tb-form-group">
                    <label class="tb-label"><?php esc_html_e('Date', 'transfers-booking'); ?></label>
                    <input type="date" id="tb-checkout-date-display" class="tb-input" disabled>
                </div>
                <div class="tb-form-group">
                    <label class="tb-label"><?php esc_html_e('Time', 'transfers-booking'); ?></label>
                    <input type="time" id="tb-checkout-time-display" class="tb-input" disabled>
                </div>
            </div>
            <div class="tb-checkout-location">
                <span class="tb-checkout-location__dot tb-checkout-location__dot--dropoff"></span>
                <span class="tb-checkout-location__text" id="tb-checkout-dropoff-display">--</span>
            </div>
            <div id="tb-pickup-instructions"></div>
            <div class="tb-form-group">
                <label class="tb-label"><?php esc_html_e('More details about the address', 'transfers-booking'); ?></label>
                <input type="text" id="tb-special-requests" class="tb-input" placeholder="<?php esc_attr_e('Hotel name, room number, etc.', 'transfers-booking'); ?>">
            </div>
        </div>

        <!-- Personal Information Card -->
        <div class="tb-card">
            <h4 class="tb-card__title"><?php esc_html_e('Personal Information', 'transfers-booking'); ?></h4>
            <div class="tb-checkout-row">
                <div class="tb-form-group">
                    <label class="tb-label" for="tb-customer-first-name"><?php esc_html_e('First Name', 'transfers-booking'); ?> *</label>
                    <input type="text" id="tb-customer-first-name" class="tb-input" placeholder="<?php esc_attr_e('Enter your first name', 'transfers-booking'); ?>">
                    <div class="tb-field-error" data-field="first-name"></div>
                </div>
                <div class="tb-form-group">
                    <label class="tb-label" for="tb-customer-last-name"><?php esc_html_e('Last Name', 'transfers-booking'); ?> *</label>
                    <input type="text" id="tb-customer-last-name" class="tb-input" placeholder="<?php esc_attr_e('Enter your last name', 'transfers-booking'); ?>">
                    <div class="tb-field-error" data-field="last-name"></div>
                </div>
            </div>
            <div class="tb-form-group">
                <label class="tb-label" for="tb-customer-email"><?php esc_html_e('Email', 'transfers-booking'); ?> *</label>
                <input type="email" id="tb-customer-email" class="tb-input" placeholder="<?php esc_attr_e('Enter your email', 'transfers-booking'); ?>">
                <div class="tb-field-error" data-field="email"></div>
            </div>
            <div class="tb-form-group">
                <label class="tb-label"><?php esc_html_e('Nationality', 'transfers-booking'); ?></label>
                <select id="tb-customer-nationality" class="tb-input tb-select">
                    <option value=""><?php esc_html_e('Please select country', 'transfers-booking'); ?></option>
                </select>
            </div>
            <div class="tb-form-group">
                <label class="tb-label" for="tb-customer-phone"><?php esc_html_e('Phone Number', 'transfers-booking'); ?> *</label>
                <div class="tb-phone-input">
                    <input type="text" id="tb-phone-code" class="tb-phone-input__code-input" placeholder="+212" maxlength="5" aria-label="<?php esc_attr_e('Country code', 'transfers-booking'); ?>">
                    <input type="tel" id="tb-customer-phone" class="tb-phone-input__field" placeholder="">
                </div>
                <div class="tb-field-error" data-field="phone"></div>
            </div>
            <div class="tb-form-group">
                <label class="tb-label"><?php esc_html_e('WhatsApp Number', 'transfers-booking'); ?></label>
                <div class="tb-phone-input">
                    <input type="text" id="tb-wa-code" class="tb-phone-input__code-input" placeholder="+212" maxlength="5" aria-label="<?php esc_attr_e('Country code', 'transfers-booking'); ?>">
                    <input type="tel" id="tb-customer-whatsapp" class="tb-phone-input__field" placeholder="">
                </div>
            </div>
        </div>

        <!-- Custom Fields (dynamically populated by JS) -->
        <div id="tb-custom-fields-card" class="tb-card" style="display:none;">
            <h4 class="tb-card__title"><?php esc_html_e('Additional Information', 'transfers-booking'); ?></h4>
            <div id="tb-custom-fields-container"></div>
        </div>

        <!-- Promo Code Card -->
        <div class="tb-card">
            <h4 class="tb-card__title"><?php esc_html_e('Promo Code', 'transfers-booking'); ?></h4>
            <div class="tb-promo-row">
                <input type="text" id="tb-promo-code" class="tb-input tb-promo-row__input" placeholder="<?php esc_attr_e('Enter promo code', 'transfers-booking'); ?>">
                <button type="button" id="tb-promo-apply" class="tb-btn tb-btn--outline tb-promo-row__btn"><?php esc_html_e('Apply', 'transfers-booking'); ?></button>
            </div>
            <div id="tb-promo-message" class="tb-promo-message" style="display:none;"></div>
        </div>

        <!-- Payment Card -->
        <div class="tb-card" id="tb-payment-card">
            <h4 class="tb-card__title"><?php esc_html_e('Payment Options', 'transfers-booking'); ?></h4>
            <div id="tb-payment-errors" class="tb-alert tb-alert--error" style="display: none;"></div>

            <!-- Payment Choice Cards -->
            <div id="tb-payment-choices" class="tb-payment-choices">
                <!-- Dynamically populated by JS based on available gateways -->
            </div>

            <!-- Legacy Gateway Selector (hidden, used internally) -->
            <div class="tb-gateway-selector" id="tb-gateway-selector" style="display: none !important;">
                <label class="tb-gateway-option" data-gateway="stripe" style="display: none !important;">
                    <input type="radio" name="tb-gateway" value="stripe">
                    <span class="tb-gateway-option__label"><?php esc_html_e('Credit / Debit Card', 'transfers-booking'); ?></span>
                </label>
                <label class="tb-gateway-option" data-gateway="cash" style="display: none !important;">
                    <input type="radio" name="tb-gateway" value="cash">
                    <span class="tb-gateway-option__label"><?php esc_html_e('Cash on Pickup', 'transfers-booking'); ?></span>
                </label>
                <label class="tb-gateway-option" data-gateway="paypal" style="display: none !important;">
                    <input type="radio" name="tb-gateway" value="paypal">
                    <span class="tb-gateway-option__label"><?php esc_html_e('PayPal', 'transfers-booking'); ?></span>
                </label>
            </div>

            <!-- Legacy Payment options (hidden, used internally) -->
            <div id="tb-payment-options" class="tb-payment-options" style="display: none;">
                <label class="tb-payment-option tb-payment-option--active">
                    <input type="radio" name="tb-payment-type" value="full" checked>
                    <div class="tb-payment-option__content">
                        <span class="tb-payment-option__label"><?php esc_html_e('Pay full amount', 'transfers-booking'); ?></span>
                        <span class="tb-payment-option__amount" id="tb-option-full-amount"></span>
                    </div>
                </label>
                <label class="tb-payment-option">
                    <input type="radio" name="tb-payment-type" value="deposit">
                    <div class="tb-payment-option__content">
                        <span class="tb-payment-option__label"><?php esc_html_e('Pay deposit only', 'transfers-booking'); ?></span>
                        <span class="tb-payment-option__amount" id="tb-option-deposit-amount"></span>
                        <span class="tb-payment-option__note" id="tb-option-remaining"></span>
                    </div>
                </label>
            </div>

            <!-- Terms & Conditions -->
            <div class="tb-terms">
                <label class="tb-terms__label">
                    <input type="checkbox" id="tb-terms-checkbox" class="tb-terms__checkbox">
                    <span><?php printf(
                        esc_html__('I agree to the %sTerms & Conditions%s and %sPrivacy Policy%s', 'transfers-booking'),
                        '<a href="#" target="_blank">', '</a>',
                        '<a href="#" target="_blank">', '</a>'
                    ); ?></span>
                </label>
                <div class="tb-field-error" data-field="terms"></div>
            </div>

            <button type="button" id="tb-pay-button" class="tb-btn tb-btn--primary tb-btn--full">
                <?php esc_html_e('Proceed to Checkout', 'transfers-booking'); ?>
            </button>
            <div id="tb-stripe-element" style="display: none !important;"></div>
            <button type="button" id="tb-confirm-payment-btn" class="tb-btn tb-btn--primary tb-btn--full" style="display: none !important; margin-top: 0.75rem;">
                <?php esc_html_e('Confirm Payment', 'transfers-booking'); ?>
            </button>
        </div>
    </div>

    <!-- RIGHT: Gradient Summary Sidebar -->
    <div class="tb-step3-sidebar">
        <div class="tb-summary-gradient">
            <div class="tb-summary-gradient__header">
                <div class="tb-summary-gradient__icon">&#128663;</div>
                <div>
                    <div class="tb-summary-gradient__vehicle-name" id="tb-order-vehicle">--</div>
                    <div class="tb-summary-gradient__vehicle-cap" id="tb-order-passengers">--</div>
                </div>
            </div>
            <div class="tb-summary-gradient__stop">
                <span class="tb-summary-gradient__dot"></span>
                <span class="tb-summary-gradient__stop-text" id="tb-order-route-from">--</span>
                <span class="tb-summary-gradient__stop-price" id="tb-order-base-price">--</span>
            </div>
            <div class="tb-summary-gradient__stop">
                <span class="tb-summary-gradient__dot"></span>
                <span class="tb-summary-gradient__stop-text" id="tb-order-route-to">--</span>
            </div>
            <!-- Round trip return leg (hidden by default) -->
            <div id="tb-order-return-leg" style="display:none;">
                <div class="tb-summary-gradient__divider"></div>
                <div class="tb-summary-gradient__stop">
                    <span class="tb-summary-gradient__dot"></span>
                    <span class="tb-summary-gradient__stop-text" id="tb-order-return-from">--</span>
                    <span class="tb-summary-gradient__stop-price" id="tb-order-return-price">--</span>
                </div>
                <div class="tb-summary-gradient__stop">
                    <span class="tb-summary-gradient__dot"></span>
                    <span class="tb-summary-gradient__stop-text" id="tb-order-return-to">--</span>
                </div>
            </div>
            <div class="tb-summary-gradient__extras" id="tb-order-extras-list"></div>
            <div class="tb-summary-gradient__total">
                <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                <span id="tb-order-total">--</span>
            </div>
        </div>
        <!-- Hidden compat elements -->
        <div style="display:none;">
            <span id="tb-order-route">--</span>
            <span id="tb-order-datetime">--</span>
        </div>
    </div>
</div>

