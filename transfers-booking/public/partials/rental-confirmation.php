<?php
/**
 * Rental confirmation page template.
 * Displays booking details after successful rental booking.
 */
defined('ABSPATH') || exit;
?>
<div id="tb-rental-confirmation" class="tb-rental-confirmation" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <!-- Loading state -->
    <div id="tb-rental-confirmation-loading" class="tb-rental-confirmation__loading">
        <div class="tb-rental-confirmation__spinner"></div>
        <p><?php esc_html_e('Loading booking details...', 'transfers-booking'); ?></p>
    </div>

    <!-- Error state -->
    <div id="tb-rental-confirmation-error" class="tb-rental-confirmation__error" style="display:none;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#EF4444" stroke-width="2"/><path d="M24 16v10M24 30v2" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/></svg>
        <h2><?php esc_html_e('Booking Not Found', 'transfers-booking'); ?></h2>
        <p id="tb-rental-confirmation-error-msg"><?php esc_html_e('We could not find this booking. Please check your reference number.', 'transfers-booking'); ?></p>
        <a href="/" class="tb-rental-confirmation__btn"><?php esc_html_e('Back to Home', 'transfers-booking'); ?></a>
    </div>

    <!-- Success content -->
    <div id="tb-rental-confirmation-content" class="tb-rental-confirmation__content" style="display:none;">

        <!-- Animated checkmark -->
        <div class="tb-rental-confirmation__icon">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="34" stroke="#10B981" stroke-width="3" class="tb-rental-confirmation__circle"/>
                <path d="M22 36l10 10 18-20" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="tb-rental-confirmation__check"/>
            </svg>
        </div>

        <h1 class="tb-rental-confirmation__title"><?php esc_html_e('Rental Confirmed!', 'transfers-booking'); ?></h1>

        <!-- Booking reference -->
        <div class="tb-rental-confirmation__ref">
            <span class="tb-rental-confirmation__ref-label"><?php esc_html_e('Booking Reference', 'transfers-booking'); ?></span>
            <div class="tb-rental-confirmation__ref-value" id="tb-rental-confirmation-ref" title="<?php esc_attr_e('Click to copy', 'transfers-booking'); ?>"></div>
            <span class="tb-rental-confirmation__ref-copied" id="tb-rental-confirmation-copied"><?php esc_html_e('Copied!', 'transfers-booking'); ?></span>
        </div>

        <!-- Vehicle & Company Details -->
        <div class="tb-rental-confirmation__card">
            <h3 class="tb-rental-confirmation__card-title"><?php esc_html_e('Vehicle Details', 'transfers-booking'); ?></h3>
            <div class="tb-rental-confirmation__detail-grid">
                <div class="tb-rental-confirmation__detail">
                    <span class="tb-rental-confirmation__detail-label"><?php esc_html_e('Vehicle', 'transfers-booking'); ?></span>
                    <span class="tb-rental-confirmation__detail-value" id="tb-rental-confirmation-vehicle"></span>
                </div>
                <div class="tb-rental-confirmation__detail">
                    <span class="tb-rental-confirmation__detail-label"><?php esc_html_e('Company', 'transfers-booking'); ?></span>
                    <span class="tb-rental-confirmation__detail-value" id="tb-rental-confirmation-company"></span>
                </div>
                <div class="tb-rental-confirmation__detail">
                    <span class="tb-rental-confirmation__detail-label"><?php esc_html_e('Pickup City', 'transfers-booking'); ?></span>
                    <span class="tb-rental-confirmation__detail-value" id="tb-rental-confirmation-city"></span>
                </div>
            </div>
        </div>

        <!-- Dates & Pricing -->
        <div class="tb-rental-confirmation__card">
            <h3 class="tb-rental-confirmation__card-title"><?php esc_html_e('Dates & Pricing', 'transfers-booking'); ?></h3>
            <div class="tb-rental-confirmation__detail-grid">
                <div class="tb-rental-confirmation__detail">
                    <span class="tb-rental-confirmation__detail-label"><?php esc_html_e('Pickup Date', 'transfers-booking'); ?></span>
                    <span class="tb-rental-confirmation__detail-value" id="tb-rental-confirmation-pickup-date"></span>
                </div>
                <div class="tb-rental-confirmation__detail">
                    <span class="tb-rental-confirmation__detail-label"><?php esc_html_e('Return Date', 'transfers-booking'); ?></span>
                    <span class="tb-rental-confirmation__detail-value" id="tb-rental-confirmation-return-date"></span>
                </div>
                <div class="tb-rental-confirmation__detail">
                    <span class="tb-rental-confirmation__detail-label"><?php esc_html_e('Duration', 'transfers-booking'); ?></span>
                    <span class="tb-rental-confirmation__detail-value" id="tb-rental-confirmation-duration"></span>
                </div>
            </div>

            <div class="tb-rental-confirmation__payment-lines" id="tb-rental-confirmation-payment-lines">
                <div class="tb-rental-confirmation__payment-line">
                    <span><?php esc_html_e('Rental Cost', 'transfers-booking'); ?></span>
                    <span id="tb-rental-confirmation-rental-cost"></span>
                </div>
                <div class="tb-rental-confirmation__payment-line" id="tb-rental-confirmation-insurance-row" style="display:none;">
                    <span><?php esc_html_e('Insurance', 'transfers-booking'); ?></span>
                    <span id="tb-rental-confirmation-insurance"></span>
                </div>
                <div class="tb-rental-confirmation__payment-line" id="tb-rental-confirmation-extras-row" style="display:none;">
                    <span><?php esc_html_e('Extras', 'transfers-booking'); ?></span>
                    <span id="tb-rental-confirmation-extras"></span>
                </div>
                <div class="tb-rental-confirmation__payment-line" id="tb-rental-confirmation-discount-row" style="display:none;">
                    <span><?php esc_html_e('Discount', 'transfers-booking'); ?></span>
                    <span id="tb-rental-confirmation-discount" class="tb-rental-confirmation__discount"></span>
                </div>
                <div class="tb-rental-confirmation__payment-line tb-rental-confirmation__payment-line--total">
                    <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                    <span id="tb-rental-confirmation-total"></span>
                </div>
            </div>
        </div>

        <!-- Company Contact Info -->
        <div class="tb-rental-confirmation__card">
            <h3 class="tb-rental-confirmation__card-title"><?php esc_html_e('Pickup Coordination', 'transfers-booking'); ?></h3>
            <div class="tb-rental-confirmation__contact" id="tb-rental-confirmation-contact">
                <p><?php esc_html_e('The rental company will contact you with pickup instructions.', 'transfers-booking'); ?></p>
                <div class="tb-rental-confirmation__contact-details" id="tb-rental-confirmation-contact-details">
                    <!-- Populated by JS -->
                </div>
            </div>
        </div>

        <!-- What's Next -->
        <div class="tb-rental-confirmation__card">
            <h3 class="tb-rental-confirmation__card-title"><?php esc_html_e("What's Next", 'transfers-booking'); ?></h3>
            <div class="tb-rental-confirmation__timeline">
                <div class="tb-rental-confirmation__timeline-item">
                    <div class="tb-rental-confirmation__timeline-dot">1</div>
                    <div class="tb-rental-confirmation__timeline-content">
                        <strong><?php esc_html_e('Check your email', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('You will receive a confirmation email with all the rental details.', 'transfers-booking'); ?></p>
                    </div>
                </div>
                <div class="tb-rental-confirmation__timeline-item">
                    <div class="tb-rental-confirmation__timeline-dot">2</div>
                    <div class="tb-rental-confirmation__timeline-content">
                        <strong><?php esc_html_e('Bring your documents', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('Have your driving license, ID/passport, and booking reference ready at pickup.', 'transfers-booking'); ?></p>
                    </div>
                </div>
                <div class="tb-rental-confirmation__timeline-item">
                    <div class="tb-rental-confirmation__timeline-dot">3</div>
                    <div class="tb-rental-confirmation__timeline-content">
                        <strong><?php esc_html_e('Pick up your car', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('Collect your vehicle at the agreed location. Inspect the car and sign the rental agreement.', 'transfers-booking'); ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action buttons -->
        <div class="tb-rental-confirmation__actions">
            <button type="button" id="tb-rental-confirmation-print" class="tb-rental-confirmation__btn tb-rental-confirmation__btn--outline">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6V1h8v5M4 12H2V8h12v4h-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="10" width="8" height="4" stroke="currentColor" stroke-width="1.2"/></svg>
                <?php esc_html_e('Print', 'transfers-booking'); ?>
            </button>
            <a href="/" class="tb-rental-confirmation__btn tb-rental-confirmation__btn--primary">
                <?php esc_html_e('Back to Home', 'transfers-booking'); ?>
            </a>
        </div>
    </div>
</div>
