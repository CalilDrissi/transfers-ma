<?php
/**
 * Checkout page template.
 * Two-column layout: forms (left) + gradient summary (right).
 */
defined('ABSPATH') || exit;
$lang_param = isset($_GET['lang']) ? sanitize_text_field($_GET['lang']) : '';
$rtl_langs = ['ar', 'he', 'fa', 'ur', 'ps', 'ku'];
$dir = is_rtl() ? 'rtl' : 'ltr';
if ($lang_param && in_array(substr($lang_param, 0, 2), $rtl_langs, true)) {
    $dir = 'rtl';
}
?>
<div id="tb-checkout" class="tb-checkout" dir="<?php echo esc_attr($dir); ?>">

    <!-- Checkout Progress -->
    <div class="tb-checkout-progress">
        <div class="tb-checkout-progress__step tb-checkout-progress__step--done"><?php esc_html_e('Ride Type', 'transfers-booking'); ?></div>
        <div class="tb-checkout-progress__step tb-checkout-progress__step--active"><?php esc_html_e('Booking Details', 'transfers-booking'); ?></div>
        <div class="tb-checkout-progress__step tb-checkout-progress__step--upcoming"><?php esc_html_e('Checkout', 'transfers-booking'); ?></div>
    </div>

    <!-- Back link -->
    <a href="#" id="tb-checkout-back" class="tb-checkout__back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <?php esc_html_e('Back to vehicles', 'transfers-booking'); ?>
    </a>

    <div class="tb-checkout__layout">

        <!-- LEFT COLUMN: Forms -->
        <div class="tb-checkout__forms">

            <!-- Transfer Details -->
            <div class="tb-checkout__card">
                <h3 class="tb-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" fill="currentColor"/></svg>
                    <?php esc_html_e('Transfer Details', 'transfers-booking'); ?>
                </h3>
                <div class="tb-checkout-location">
                    <span class="tb-checkout-location__dot tb-checkout-location__dot--pickup"></span>
                    <span class="tb-checkout-location__text" id="tb-checkout-pickup-display">--</span>
                </div>
                <div class="tb-checkout__field" id="tb-checkout-flight-field" style="display:none;">
                    <label class="tb-checkout__label" for="tb-checkout-flight"><?php esc_html_e('Flight Number', 'transfers-booking'); ?></label>
                    <input type="text" id="tb-checkout-flight" class="tb-checkout__input" placeholder="<?php esc_attr_e('e.g. RAM 205', 'transfers-booking'); ?>" autocomplete="off">
                </div>
                <div class="tb-checkout-row">
                    <div class="tb-checkout__field">
                        <label class="tb-checkout__label"><?php esc_html_e('Date', 'transfers-booking'); ?></label>
                        <input type="date" id="tb-checkout-date-display" class="tb-checkout__input" disabled>
                    </div>
                    <div class="tb-checkout__field">
                        <label class="tb-checkout__label"><?php esc_html_e('Time', 'transfers-booking'); ?></label>
                        <input type="time" id="tb-checkout-time-display" class="tb-checkout__input" disabled>
                    </div>
                </div>
                <div class="tb-checkout-location">
                    <span class="tb-checkout-location__dot tb-checkout-location__dot--dropoff"></span>
                    <span class="tb-checkout-location__text" id="tb-checkout-dropoff-display">--</span>
                </div>
                <div class="tb-checkout__field">
                    <label class="tb-checkout__label" for="tb-checkout-pickup-address"><?php esc_html_e('More details about the address', 'transfers-booking'); ?></label>
                    <input type="text" id="tb-checkout-pickup-address" class="tb-checkout__input" placeholder="<?php esc_attr_e('Hotel name, room number, etc.', 'transfers-booking'); ?>">
                </div>
                <div class="tb-checkout__field">
                    <label class="tb-checkout__label" for="tb-checkout-requests"><?php esc_html_e('Special Requests', 'transfers-booking'); ?></label>
                    <textarea id="tb-checkout-requests" class="tb-checkout__textarea" rows="3" placeholder="<?php esc_attr_e('Child seat, wheelchair, extra stops...', 'transfers-booking'); ?>"></textarea>
                </div>
            </div>

            <!-- Personal Information -->
            <div class="tb-checkout__card">
                <h3 class="tb-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" fill="currentColor"/></svg>
                    <?php esc_html_e('Personal Information', 'transfers-booking'); ?>
                </h3>
                <div class="tb-checkout-row">
                    <div class="tb-checkout__field">
                        <label class="tb-checkout__label" for="tb-checkout-first-name"><?php esc_html_e('First Name', 'transfers-booking'); ?> *</label>
                        <input type="text" id="tb-checkout-first-name" class="tb-checkout__input" required autocomplete="given-name">
                        <span class="tb-checkout__field-error" data-field="first-name"></span>
                    </div>
                    <div class="tb-checkout__field">
                        <label class="tb-checkout__label" for="tb-checkout-last-name"><?php esc_html_e('Last Name', 'transfers-booking'); ?> *</label>
                        <input type="text" id="tb-checkout-last-name" class="tb-checkout__input" required autocomplete="family-name">
                        <span class="tb-checkout__field-error" data-field="last-name"></span>
                    </div>
                </div>
                <div class="tb-checkout__field">
                    <label class="tb-checkout__label" for="tb-checkout-email"><?php esc_html_e('Email Address', 'transfers-booking'); ?> *</label>
                    <input type="email" id="tb-checkout-email" class="tb-checkout__input" required autocomplete="email">
                    <span class="tb-checkout__field-error" data-field="email"></span>
                </div>
                <div class="tb-checkout__field">
                    <label class="tb-checkout__label" for="tb-checkout-phone"><?php esc_html_e('Phone Number', 'transfers-booking'); ?> *</label>
                    <div class="tb-phone-input">
                        <div class="tb-phone-input__prefix">+212</div>
                        <input type="tel" id="tb-checkout-phone" class="tb-phone-input__field" required autocomplete="tel">
                    </div>
                    <span class="tb-checkout__field-error" data-field="phone"></span>
                </div>
                <div class="tb-checkout__field">
                    <label class="tb-checkout__label"><?php esc_html_e('WhatsApp Number', 'transfers-booking'); ?></label>
                    <div class="tb-phone-input">
                        <div class="tb-phone-input__prefix">+212</div>
                        <input type="tel" id="tb-checkout-whatsapp" class="tb-phone-input__field">
                    </div>
                </div>
            </div>

            <!-- Promo Code -->
            <div class="tb-checkout__card">
                <h3 class="tb-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 010 4v2a2 2 0 002 2h10a2 2 0 002-2v-2a2 2 0 010-4z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 8v4M12 8v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    <?php esc_html_e('Promo Code', 'transfers-booking'); ?>
                </h3>
                <div class="tb-checkout__coupon" id="tb-checkout-coupon">
                    <div class="tb-checkout__coupon-input-row">
                        <input type="text" id="tb-checkout-coupon-code" class="tb-checkout__input tb-checkout__input--coupon" placeholder="<?php esc_attr_e('Enter promo code', 'transfers-booking'); ?>">
                        <button type="button" id="tb-checkout-coupon-apply" class="tb-checkout__coupon-btn"><?php esc_html_e('Apply', 'transfers-booking'); ?></button>
                    </div>
                    <div class="tb-checkout__coupon-success" id="tb-checkout-coupon-success" style="display:none;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#10B981" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span id="tb-checkout-coupon-message"></span>
                        <a href="#" id="tb-checkout-coupon-remove"><?php esc_html_e('Remove', 'transfers-booking'); ?></a>
                    </div>
                    <div class="tb-checkout__coupon-error" id="tb-checkout-coupon-error" style="display:none;"></div>
                </div>
            </div>

            <!-- Payment Method -->
            <div class="tb-checkout__card">
                <h3 class="tb-checkout__card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 8h16" stroke="currentColor" stroke-width="1.5"/></svg>
                    <?php esc_html_e('Payment Method', 'transfers-booking'); ?>
                </h3>
                <div class="tb-checkout__gateways" id="tb-checkout-gateways">
                    <div class="tb-checkout__gateways-loading">
                        <span class="tb-checkout__spinner"></span>
                        <?php esc_html_e('Loading payment methods...', 'transfers-booking'); ?>
                    </div>
                </div>
                <div id="tb-checkout-stripe-container" class="tb-checkout__stripe-container" style="display:none;">
                    <div id="tb-stripe-element" class="tb-checkout__stripe-element"></div>
                    <div id="tb-stripe-errors" class="tb-checkout__stripe-errors"></div>
                </div>
                <div id="tb-checkout-paypal-container" class="tb-checkout__paypal-container" style="display:none;">
                    <div id="tb-paypal-button"></div>
                </div>
                <div id="tb-checkout-cash-container" class="tb-checkout__cash-container" style="display:none;">
                    <div class="tb-checkout__cash-info">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#059669" stroke-width="1.5"/><path d="M10 6v4M10 13v.5" stroke="#059669" stroke-width="2" stroke-linecap="round"/></svg>
                        <p><?php esc_html_e('Pay the full amount directly to your driver in cash (MAD). Your booking will be confirmed immediately.', 'transfers-booking'); ?></p>
                    </div>
                </div>
                <div id="tb-checkout-remaining" class="tb-checkout__remaining" style="display:none;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#F59E0B" stroke-width="1.5"/><path d="M8 5v3M8 10v.5" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/></svg>
                    <span id="tb-checkout-remaining-text"></span>
                </div>
            </div>

            <!-- Error alert -->
            <div id="tb-checkout-alert" class="tb-checkout__alert" style="display:none;"></div>

            <!-- Submit button -->
            <button type="button" id="tb-checkout-submit" class="tb-checkout__submit" disabled>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 7h6M5 9.5h3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
                <?php esc_html_e('Complete Booking', 'transfers-booking'); ?>
            </button>
            <p class="tb-checkout__secure-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 6V4.5a3 3 0 016 0V6" stroke="currentColor" stroke-width="1.2"/><rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>
                <?php esc_html_e('Secure, encrypted payment', 'transfers-booking'); ?>
            </p>
        </div>

        <!-- RIGHT COLUMN: Gradient Summary -->
        <div class="tb-checkout__sidebar">
            <div class="tb-summary-gradient" id="tb-checkout-summary">
                <div class="tb-summary-gradient__header">
                    <div class="tb-summary-gradient__icon">&#128663;</div>
                    <div>
                        <div class="tb-summary-gradient__vehicle-name" id="tb-checkout-summary-vehicle"></div>
                        <div class="tb-summary-gradient__vehicle-cap" id="tb-checkout-summary-pax"></div>
                    </div>
                </div>
                <div class="tb-summary-gradient__stop">
                    <span class="tb-summary-gradient__dot"></span>
                    <span class="tb-summary-gradient__stop-text" id="tb-checkout-summary-from">--</span>
                    <span class="tb-summary-gradient__stop-price" id="tb-checkout-summary-base">--</span>
                </div>
                <div class="tb-summary-gradient__stop">
                    <span class="tb-summary-gradient__dot"></span>
                    <span class="tb-summary-gradient__stop-text" id="tb-checkout-summary-to">--</span>
                </div>
                <div class="tb-summary-gradient__extras" id="tb-checkout-summary-extras"></div>
                <div class="tb-summary-gradient__extra" id="tb-checkout-summary-discount-line" style="display:none;">
                    <span id="tb-checkout-summary-discount-label"></span>
                    <span id="tb-checkout-summary-discount-value"></span>
                </div>
                <div class="tb-summary-gradient__total">
                    <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                    <span id="tb-checkout-summary-total">--</span>
                </div>
                <div class="tb-summary-gradient__deposit" id="tb-checkout-summary-deposit-row" style="display:none;">
                    <span><?php esc_html_e('Deposit', 'transfers-booking'); ?></span>
                    <span id="tb-checkout-summary-deposit">--</span>
                </div>
                <div class="tb-summary-gradient__deposit" id="tb-checkout-summary-remaining-row" style="display:none;">
                    <span><?php esc_html_e('Due to driver', 'transfers-booking'); ?></span>
                    <span id="tb-checkout-summary-remaining">--</span>
                </div>
            </div>
            <!-- Hidden: date/return info -->
            <div style="display:none;">
                <span id="tb-checkout-summary-date"></span>
                <span id="tb-checkout-summary-return-row"><span id="tb-checkout-summary-return"></span></span>
            </div>
        </div>

    </div>
</div>
