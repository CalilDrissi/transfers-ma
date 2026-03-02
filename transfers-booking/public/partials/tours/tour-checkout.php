<?php
/**
 * Tour checkout page template.
 * Two-column layout: forms (left) + sticky order summary (right).
 */
defined('ABSPATH') || exit;
?>
<div id="tb-tour-checkout" class="tb-tour-checkout" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <!-- Back link -->
    <a href="#" id="tb-tour-checkout-back" class="tb-tour-checkout__back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <?php esc_html_e('Back to tour', 'transfers-booking'); ?>
    </a>

    <div class="tb-tour-checkout__layout">

        <!-- LEFT COLUMN: Forms -->
        <div class="tb-tour-checkout__forms">

            <!-- Tour Summary Card -->
            <div class="tb-tour-checkout__card" id="tb-tour-checkout-summary">
                <h3 class="tb-tour-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L3 7v9a2 2 0 002 2h10a2 2 0 002-2V7l-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 18v-6h6v6" stroke="currentColor" stroke-width="1.5"/></svg>
                    <?php esc_html_e('Tour Details', 'transfers-booking'); ?>
                </h3>
                <div class="tb-tour-checkout__tour-summary">
                    <h4 id="tb-tour-checkout-name"></h4>
                    <div class="tb-tour-checkout__tour-meta">
                        <span class="tb-tour-checkout__tour-meta-item" id="tb-tour-checkout-date">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M1 5.5h12M4 1v2M10 1v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        </span>
                        <span class="tb-tour-checkout__tour-meta-item" id="tb-tour-checkout-pax">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm0 1.5c-3 0-5 1.5-5 3v.5h10v-.5c0-1.5-2-3-5-3z" fill="currentColor"/></svg>
                        </span>
                        <span class="tb-tour-checkout__tour-meta-item tb-tour-checkout__tour-meta-item--private" id="tb-tour-checkout-private" style="display:none;">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3v4c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V3L7 1z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
                            <?php esc_html_e('Private Tour', 'transfers-booking'); ?>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Personal Details -->
            <div class="tb-tour-checkout__card">
                <h3 class="tb-tour-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" fill="currentColor"/></svg>
                    <?php esc_html_e('Personal Details', 'transfers-booking'); ?>
                </h3>

                <div class="tb-tour-checkout__field">
                    <label class="tb-tour-checkout__label" for="tb-tour-name"><?php esc_html_e('Full Name', 'transfers-booking'); ?> *</label>
                    <input type="text" id="tb-tour-name" class="tb-tour-checkout__input" required autocomplete="name">
                    <span class="tb-tour-checkout__field-error" data-field="name"></span>
                </div>

                <div class="tb-tour-checkout__field">
                    <label class="tb-tour-checkout__label" for="tb-tour-email"><?php esc_html_e('Email Address', 'transfers-booking'); ?> *</label>
                    <input type="email" id="tb-tour-email" class="tb-tour-checkout__input" required autocomplete="email">
                    <span class="tb-tour-checkout__field-error" data-field="email"></span>
                </div>

                <div class="tb-tour-checkout__field">
                    <label class="tb-tour-checkout__label" for="tb-tour-phone"><?php esc_html_e('Phone Number', 'transfers-booking'); ?> *</label>
                    <div class="tb-tour-checkout__phone-row">
                        <span class="tb-tour-checkout__phone-prefix">+212</span>
                        <input type="tel" id="tb-tour-phone" class="tb-tour-checkout__input tb-tour-checkout__input--phone" required autocomplete="tel">
                    </div>
                    <span class="tb-tour-checkout__field-error" data-field="phone"></span>
                </div>

                <div class="tb-tour-checkout__field">
                    <label class="tb-tour-checkout__label" for="tb-tour-whatsapp"><?php esc_html_e('WhatsApp Number', 'transfers-booking'); ?></label>
                    <input type="tel" id="tb-tour-whatsapp" class="tb-tour-checkout__input" placeholder="<?php esc_attr_e('e.g. +212600000000', 'transfers-booking'); ?>" autocomplete="off">
                </div>

                <div class="tb-tour-checkout__field">
                    <label class="tb-tour-checkout__label" for="tb-tour-requests"><?php esc_html_e('Special Requests', 'transfers-booking'); ?></label>
                    <textarea id="tb-tour-requests" class="tb-tour-checkout__textarea" rows="3" placeholder="<?php esc_attr_e('Any special requirements or notes...', 'transfers-booking'); ?>"></textarea>
                </div>
            </div>

            <!-- Promo Code -->
            <div class="tb-tour-checkout__card">
                <h3 class="tb-tour-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 010 4v2a2 2 0 002 2h10a2 2 0 002-2v-2a2 2 0 010-4z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 8v4M12 8v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    <?php esc_html_e('Promo Code', 'transfers-booking'); ?>
                </h3>
                <div class="tb-tour-checkout__coupon" id="tb-tour-coupon">
                    <div class="tb-tour-checkout__coupon-row">
                        <input type="text" id="tb-tour-coupon-code" class="tb-tour-checkout__input tb-tour-checkout__input--coupon" placeholder="<?php esc_attr_e('Enter promo code', 'transfers-booking'); ?>">
                        <button type="button" id="tb-tour-coupon-apply" class="tb-tour-checkout__coupon-btn"><?php esc_html_e('Apply', 'transfers-booking'); ?></button>
                    </div>
                    <div class="tb-tour-checkout__coupon-success" id="tb-tour-coupon-success" style="display:none;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#10B981" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span id="tb-tour-coupon-message"></span>
                        <a href="#" id="tb-tour-coupon-remove"><?php esc_html_e('Remove', 'transfers-booking'); ?></a>
                    </div>
                    <div class="tb-tour-checkout__coupon-error" id="tb-tour-coupon-error" style="display:none;"></div>
                </div>
            </div>

            <!-- Payment Method -->
            <div class="tb-tour-checkout__card">
                <h3 class="tb-tour-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 8h16" stroke="currentColor" stroke-width="1.5"/></svg>
                    <?php esc_html_e('Payment Method', 'transfers-booking'); ?>
                </h3>
                <div class="tb-tour-checkout__gateways" id="tb-tour-gateways">
                    <div class="tb-tour-checkout__gateways-loading">
                        <span class="tb-tour-checkout__spinner"></span>
                        <?php esc_html_e('Loading payment methods...', 'transfers-booking'); ?>
                    </div>
                </div>

                <!-- Stripe -->
                <div id="tb-tour-stripe-container" class="tb-tour-checkout__stripe-container" style="display:none;">
                    <div id="tb-tour-stripe-element" class="tb-tour-checkout__stripe-element"></div>
                    <div id="tb-tour-stripe-errors" class="tb-tour-checkout__stripe-errors"></div>
                </div>

                <!-- PayPal -->
                <div id="tb-tour-paypal-container" class="tb-tour-checkout__paypal-container" style="display:none;">
                    <div id="tb-tour-paypal-button"></div>
                </div>

                <!-- Cash -->
                <div id="tb-tour-cash-container" class="tb-tour-checkout__cash-container" style="display:none;">
                    <div class="tb-tour-checkout__cash-info">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#059669" stroke-width="1.5"/><path d="M10 6v4M10 13v.5" stroke="#059669" stroke-width="2" stroke-linecap="round"/></svg>
                        <p><?php esc_html_e('Pay the full amount in cash to your tour guide on the day of the tour.', 'transfers-booking'); ?></p>
                    </div>
                </div>
            </div>

            <!-- Terms -->
            <div class="tb-tour-checkout__terms">
                <label class="tb-tour-checkout__terms-label">
                    <input type="checkbox" id="tb-tour-terms" required>
                    <span>
                        <?php
                        printf(
                            /* translators: %s: link to terms page */
                            esc_html__('I agree to the %s and tour conditions', 'transfers-booking'),
                            '<a href="/terms/" target="_blank">' . esc_html__('Terms & Conditions', 'transfers-booking') . '</a>'
                        );
                        ?>
                    </span>
                </label>
                <span class="tb-tour-checkout__field-error" data-field="terms"></span>
            </div>

            <!-- Error alert -->
            <div id="tb-tour-checkout-alert" class="tb-tour-checkout__alert" style="display:none;"></div>

            <!-- Submit button -->
            <button type="button" id="tb-tour-checkout-submit" class="tb-tour-checkout__submit" disabled>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <?php esc_html_e('Confirm Booking', 'transfers-booking'); ?>
            </button>
            <p class="tb-tour-checkout__secure-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 6V4.5a3 3 0 016 0V6" stroke="currentColor" stroke-width="1.2"/><rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>
                <?php esc_html_e('Secure, encrypted payment', 'transfers-booking'); ?>
            </p>
        </div>

        <!-- RIGHT COLUMN: Order Summary -->
        <div class="tb-tour-checkout__sidebar">
            <div class="tb-tour-summary" id="tb-tour-summary">
                <h3 class="tb-tour-summary__title"><?php esc_html_e('Order Summary', 'transfers-booking'); ?></h3>

                <div class="tb-tour-summary__lines" id="tb-tour-summary-lines">
                    <div class="tb-tour-summary__line" id="tb-tour-summary-adults-line">
                        <span id="tb-tour-summary-adults-label"></span>
                        <span id="tb-tour-summary-adults-price"></span>
                    </div>
                    <div class="tb-tour-summary__line" id="tb-tour-summary-children-line" style="display:none;">
                        <span id="tb-tour-summary-children-label"></span>
                        <span id="tb-tour-summary-children-price"></span>
                    </div>
                    <div class="tb-tour-summary__line" id="tb-tour-summary-private-line" style="display:none;">
                        <span><?php esc_html_e('Private Tour', 'transfers-booking'); ?></span>
                        <span id="tb-tour-summary-private-price"></span>
                    </div>
                    <div class="tb-tour-summary__line tb-tour-summary__line--discount" id="tb-tour-summary-discount-line" style="display:none;">
                        <span id="tb-tour-summary-discount-label"></span>
                        <span id="tb-tour-summary-discount-value"></span>
                    </div>
                </div>

                <div class="tb-tour-summary__divider"></div>

                <div class="tb-tour-summary__total">
                    <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                    <span id="tb-tour-summary-total"></span>
                </div>

                <div class="tb-tour-summary__trust">
                    <div class="tb-tour-summary__trust-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <?php esc_html_e('Instant confirmation', 'transfers-booking'); ?>
                    </div>
                    <div class="tb-tour-summary__trust-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <?php esc_html_e('Licensed local guides', 'transfers-booking'); ?>
                    </div>
                    <div class="tb-tour-summary__trust-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <?php esc_html_e('No hidden fees', 'transfers-booking'); ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
