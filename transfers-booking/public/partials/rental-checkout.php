<?php
/**
 * Rental checkout page template.
 * Two-column layout: forms (left) + sticky pricing summary (right).
 */
defined('ABSPATH') || exit;
?>
<div id="tb-rental-checkout" class="tb-rental-checkout" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <!-- Back link -->
    <a href="#" id="tb-rental-checkout-back" class="tb-rental-checkout__back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <?php esc_html_e('Back to results', 'transfers-booking'); ?>
    </a>

    <div class="tb-rental-checkout__layout">

        <!-- LEFT COLUMN: Forms -->
        <div class="tb-rental-checkout__forms">

            <!-- Vehicle Summary Card -->
            <div class="tb-rental-checkout__card" id="tb-rental-checkout-vehicle">
                <h3 class="tb-rental-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16 8l-2-4H6L4 8m12 0H4m12 0v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H7v1a1 1 0 01-1 1H5a1 1 0 01-1-1V8m2 3h.01M13 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <?php esc_html_e('Your Vehicle', 'transfers-booking'); ?>
                </h3>
                <div class="tb-rental-checkout__vehicle-summary">
                    <img src="" alt="" class="tb-rental-checkout__vehicle-img" id="tb-rental-checkout-vehicle-img">
                    <div class="tb-rental-checkout__vehicle-info">
                        <h4 id="tb-rental-checkout-vehicle-name"></h4>
                        <p id="tb-rental-checkout-vehicle-company"></p>
                        <div class="tb-rental-checkout__vehicle-specs" id="tb-rental-checkout-vehicle-specs"></div>
                    </div>
                </div>
            </div>

            <!-- Customer Details -->
            <div class="tb-rental-checkout__card">
                <h3 class="tb-rental-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" fill="currentColor"/></svg>
                    <?php esc_html_e('Customer Details', 'transfers-booking'); ?>
                </h3>

                <div class="tb-rental-checkout__field">
                    <label class="tb-rental-checkout__label" for="tb-rental-name"><?php esc_html_e('Full Name', 'transfers-booking'); ?> *</label>
                    <input type="text" id="tb-rental-name" class="tb-rental-checkout__input" required autocomplete="name">
                    <span class="tb-rental-checkout__field-error" data-field="name"></span>
                </div>

                <div class="tb-rental-checkout__field">
                    <label class="tb-rental-checkout__label" for="tb-rental-email"><?php esc_html_e('Email Address', 'transfers-booking'); ?> *</label>
                    <input type="email" id="tb-rental-email" class="tb-rental-checkout__input" required autocomplete="email">
                    <span class="tb-rental-checkout__field-error" data-field="email"></span>
                </div>

                <div class="tb-rental-checkout__field">
                    <label class="tb-rental-checkout__label" for="tb-rental-phone"><?php esc_html_e('Phone Number', 'transfers-booking'); ?> *</label>
                    <div class="tb-rental-checkout__phone-row">
                        <span class="tb-rental-checkout__phone-prefix">+212</span>
                        <input type="tel" id="tb-rental-phone" class="tb-rental-checkout__input tb-rental-checkout__input--phone" required autocomplete="tel">
                    </div>
                    <span class="tb-rental-checkout__field-error" data-field="phone"></span>
                </div>

                <div class="tb-rental-checkout__field">
                    <label class="tb-rental-checkout__label" for="tb-rental-flight"><?php esc_html_e('Flight Number', 'transfers-booking'); ?></label>
                    <input type="text" id="tb-rental-flight" class="tb-rental-checkout__input" placeholder="<?php esc_attr_e('e.g. RAM 205', 'transfers-booking'); ?>" autocomplete="off">
                </div>
            </div>

            <!-- Driver Info -->
            <div class="tb-rental-checkout__card">
                <h3 class="tb-rental-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6 10h8M6 13h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>
                    <?php esc_html_e('Driver Information', 'transfers-booking'); ?>
                </h3>

                <div class="tb-rental-checkout__field">
                    <label class="tb-rental-checkout__label" for="tb-rental-license"><?php esc_html_e('License Number', 'transfers-booking'); ?> *</label>
                    <input type="text" id="tb-rental-license" class="tb-rental-checkout__input" required autocomplete="off">
                    <span class="tb-rental-checkout__field-error" data-field="license_number"></span>
                </div>

                <div class="tb-rental-checkout__field-row">
                    <div class="tb-rental-checkout__field">
                        <label class="tb-rental-checkout__label" for="tb-rental-license-expiry"><?php esc_html_e('License Expiry', 'transfers-booking'); ?> *</label>
                        <input type="date" id="tb-rental-license-expiry" class="tb-rental-checkout__input" required>
                        <span class="tb-rental-checkout__field-error" data-field="license_expiry"></span>
                    </div>
                    <div class="tb-rental-checkout__field">
                        <label class="tb-rental-checkout__label" for="tb-rental-dob"><?php esc_html_e('Date of Birth', 'transfers-booking'); ?> *</label>
                        <input type="date" id="tb-rental-dob" class="tb-rental-checkout__input" required>
                        <span class="tb-rental-checkout__field-error" data-field="date_of_birth"></span>
                    </div>
                </div>
            </div>

            <!-- Insurance Options -->
            <div class="tb-rental-checkout__card" id="tb-rental-insurance-card" style="display:none;">
                <h3 class="tb-rental-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1L3 4v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V4l-7-3z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <?php esc_html_e('Insurance', 'transfers-booking'); ?>
                </h3>
                <div class="tb-rental-checkout__insurance-options" id="tb-rental-insurance-options">
                    <!-- Populated by JS -->
                </div>
            </div>

            <!-- Extras -->
            <div class="tb-rental-checkout__card" id="tb-rental-extras-card" style="display:none;">
                <h3 class="tb-rental-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    <?php esc_html_e('Extras', 'transfers-booking'); ?>
                </h3>
                <div class="tb-rental-checkout__extras-grid" id="tb-rental-extras-options">
                    <!-- Populated by JS -->
                </div>
            </div>

            <!-- Promo Code -->
            <div class="tb-rental-checkout__card">
                <h3 class="tb-rental-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 010 4v2a2 2 0 002 2h10a2 2 0 002-2v-2a2 2 0 010-4z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 8v4M12 8v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    <?php esc_html_e('Promo Code', 'transfers-booking'); ?>
                </h3>
                <div class="tb-rental-checkout__coupon" id="tb-rental-coupon">
                    <div class="tb-rental-checkout__coupon-row">
                        <input type="text" id="tb-rental-coupon-code" class="tb-rental-checkout__input tb-rental-checkout__input--coupon" placeholder="<?php esc_attr_e('Enter promo code', 'transfers-booking'); ?>">
                        <button type="button" id="tb-rental-coupon-apply" class="tb-rental-checkout__coupon-btn"><?php esc_html_e('Apply', 'transfers-booking'); ?></button>
                    </div>
                    <div class="tb-rental-checkout__coupon-success" id="tb-rental-coupon-success" style="display:none;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#10B981" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span id="tb-rental-coupon-message"></span>
                        <a href="#" id="tb-rental-coupon-remove"><?php esc_html_e('Remove', 'transfers-booking'); ?></a>
                    </div>
                    <div class="tb-rental-checkout__coupon-error" id="tb-rental-coupon-error" style="display:none;"></div>
                </div>
            </div>

            <!-- Payment Method -->
            <div class="tb-rental-checkout__card">
                <h3 class="tb-rental-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 8h16" stroke="currentColor" stroke-width="1.5"/></svg>
                    <?php esc_html_e('Payment Method', 'transfers-booking'); ?>
                </h3>
                <div class="tb-rental-checkout__gateways" id="tb-rental-gateways">
                    <div class="tb-rental-checkout__gateways-loading">
                        <span class="tb-rental-checkout__spinner"></span>
                        <?php esc_html_e('Loading payment methods...', 'transfers-booking'); ?>
                    </div>
                </div>

                <!-- Stripe -->
                <div id="tb-rental-stripe-container" class="tb-rental-checkout__stripe-container" style="display:none;">
                    <div id="tb-rental-stripe-element" class="tb-rental-checkout__stripe-element"></div>
                    <div id="tb-rental-stripe-errors" class="tb-rental-checkout__stripe-errors"></div>
                </div>

                <!-- PayPal -->
                <div id="tb-rental-paypal-container" class="tb-rental-checkout__paypal-container" style="display:none;">
                    <div id="tb-rental-paypal-button"></div>
                </div>

                <!-- Cash -->
                <div id="tb-rental-cash-container" class="tb-rental-checkout__cash-container" style="display:none;">
                    <div class="tb-rental-checkout__cash-info">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#059669" stroke-width="1.5"/><path d="M10 6v4M10 13v.5" stroke="#059669" stroke-width="2" stroke-linecap="round"/></svg>
                        <p><?php esc_html_e('Pay the full amount at the rental office when picking up the vehicle.', 'transfers-booking'); ?></p>
                    </div>
                </div>
            </div>

            <!-- Terms -->
            <div class="tb-rental-checkout__terms">
                <label class="tb-rental-checkout__terms-label">
                    <input type="checkbox" id="tb-rental-terms" required>
                    <span>
                        <?php
                        printf(
                            /* translators: %s: link to terms page */
                            esc_html__('I agree to the %s and rental conditions', 'transfers-booking'),
                            '<a href="/terms/" target="_blank">' . esc_html__('Terms & Conditions', 'transfers-booking') . '</a>'
                        );
                        ?>
                    </span>
                </label>
                <span class="tb-rental-checkout__field-error" data-field="terms"></span>
            </div>

            <!-- Error alert -->
            <div id="tb-rental-checkout-alert" class="tb-rental-checkout__alert" style="display:none;"></div>

            <!-- Submit button -->
            <button type="button" id="tb-rental-checkout-submit" class="tb-rental-checkout__submit" disabled>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 7h6M5 9.5h3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
                <?php esc_html_e('Book Now', 'transfers-booking'); ?>
            </button>
            <p class="tb-rental-checkout__secure-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 6V4.5a3 3 0 016 0V6" stroke="currentColor" stroke-width="1.2"/><rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>
                <?php esc_html_e('Secure, encrypted payment', 'transfers-booking'); ?>
            </p>
        </div>

        <!-- RIGHT COLUMN: Pricing Summary -->
        <div class="tb-rental-checkout__sidebar">
            <div class="tb-rental-summary" id="tb-rental-summary">
                <h3 class="tb-rental-summary__title"><?php esc_html_e('Price Summary', 'transfers-booking'); ?></h3>

                <div class="tb-rental-summary__dates">
                    <div class="tb-rental-summary__date-row">
                        <span class="tb-rental-summary__date-label"><?php esc_html_e('Pickup', 'transfers-booking'); ?></span>
                        <span class="tb-rental-summary__date-value" id="tb-rental-summary-pickup"></span>
                    </div>
                    <div class="tb-rental-summary__date-row">
                        <span class="tb-rental-summary__date-label"><?php esc_html_e('Return', 'transfers-booking'); ?></span>
                        <span class="tb-rental-summary__date-value" id="tb-rental-summary-return"></span>
                    </div>
                    <div class="tb-rental-summary__date-row">
                        <span class="tb-rental-summary__date-label"><?php esc_html_e('Duration', 'transfers-booking'); ?></span>
                        <span class="tb-rental-summary__date-value" id="tb-rental-summary-days"></span>
                    </div>
                </div>

                <div class="tb-rental-summary__divider"></div>

                <div class="tb-rental-summary__lines" id="tb-rental-summary-lines">
                    <div class="tb-rental-summary__line">
                        <span><?php esc_html_e('Rental', 'transfers-booking'); ?></span>
                        <span id="tb-rental-summary-base"></span>
                    </div>
                    <!-- Insurance and extras lines injected by JS -->
                    <div class="tb-rental-summary__line tb-rental-summary__line--discount" id="tb-rental-summary-discount-line" style="display:none;">
                        <span id="tb-rental-summary-discount-label"></span>
                        <span id="tb-rental-summary-discount-value"></span>
                    </div>
                </div>

                <div class="tb-rental-summary__divider"></div>

                <div class="tb-rental-summary__total">
                    <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                    <span id="tb-rental-summary-total"></span>
                </div>

                <div class="tb-rental-summary__trust">
                    <div class="tb-rental-summary__trust-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <?php esc_html_e('Free cancellation 48h before', 'transfers-booking'); ?>
                    </div>
                    <div class="tb-rental-summary__trust-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3v4c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V3L7 1z" stroke="#2E8BFF" stroke-width="1.2" fill="none"/></svg>
                        <?php esc_html_e('Full insurance available', 'transfers-booking'); ?>
                    </div>
                    <div class="tb-rental-summary__trust-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <?php esc_html_e('No hidden fees', 'transfers-booking'); ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
