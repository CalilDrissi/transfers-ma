<?php
/**
 * Booking confirmation page template.
 * Centered layout: animated checkmark, booking details, payment, what's next.
 */
defined('ABSPATH') || exit;
?>
<div id="tb-confirmation" class="tb-confirmation" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <!-- Loading state -->
    <div id="tb-confirmation-loading" class="tb-confirmation__loading">
        <div class="tb-confirmation__spinner"></div>
        <p><?php esc_html_e('Loading booking details...', 'transfers-booking'); ?></p>
    </div>

    <!-- Error state -->
    <div id="tb-confirmation-error" class="tb-confirmation__error" style="display:none;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#EF4444" stroke-width="2"/><path d="M24 16v10M24 30v2" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/></svg>
        <h2><?php esc_html_e('Booking Not Found', 'transfers-booking'); ?></h2>
        <p id="tb-confirmation-error-msg"><?php esc_html_e('We could not find this booking. Please check your reference number.', 'transfers-booking'); ?></p>
        <a href="/" class="tb-confirmation__btn"><?php esc_html_e('Back to Home', 'transfers-booking'); ?></a>
    </div>

    <!-- Success content -->
    <div id="tb-confirmation-content" class="tb-confirmation__content" style="display:none;">

        <!-- Animated checkmark -->
        <div class="tb-confirmation__icon">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="34" stroke="#10B981" stroke-width="3" class="tb-confirmation__circle"/>
                <path d="M22 36l10 10 18-20" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="tb-confirmation__check"/>
            </svg>
        </div>

        <h1 class="tb-confirmation__title"><?php esc_html_e('Booking Confirmed!', 'transfers-booking'); ?></h1>

        <!-- Booking reference -->
        <div class="tb-confirmation__ref">
            <span class="tb-confirmation__ref-label"><?php esc_html_e('Booking Reference', 'transfers-booking'); ?></span>
            <div class="tb-confirmation__ref-value" id="tb-confirmation-ref" title="<?php esc_attr_e('Click to copy', 'transfers-booking'); ?>"></div>
            <span class="tb-confirmation__ref-copied" id="tb-confirmation-copied"><?php esc_html_e('Copied!', 'transfers-booking'); ?></span>
        </div>

        <!-- Info banner -->
        <div class="tb-confirmation__info-banner">
            <p>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 5l7 4 7-4" stroke="currentColor" stroke-width="1.2"/></svg>
                <?php esc_html_e('A confirmation email has been sent to your inbox.', 'transfers-booking'); ?>
            </p>
            <p>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M6 11h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                <?php esc_html_e('Your driver will contact you via WhatsApp before the trip.', 'transfers-booking'); ?>
            </p>
        </div>

        <!-- Booking details card -->
        <div class="tb-confirmation__card">
            <h3 class="tb-confirmation__card-title"><?php esc_html_e('Booking Details', 'transfers-booking'); ?></h3>
            <div class="tb-confirmation__detail-grid">
                <div class="tb-confirmation__detail">
                    <span class="tb-confirmation__detail-label"><?php esc_html_e('Route', 'transfers-booking'); ?></span>
                    <span class="tb-confirmation__detail-value" id="tb-confirmation-route"></span>
                </div>
                <div class="tb-confirmation__detail">
                    <span class="tb-confirmation__detail-label"><?php esc_html_e('Date & Time', 'transfers-booking'); ?></span>
                    <span class="tb-confirmation__detail-value" id="tb-confirmation-date"></span>
                </div>
                <div class="tb-confirmation__detail" id="tb-confirmation-return-row" style="display:none;">
                    <span class="tb-confirmation__detail-label"><?php esc_html_e('Return', 'transfers-booking'); ?></span>
                    <span class="tb-confirmation__detail-value" id="tb-confirmation-return"></span>
                </div>
                <div class="tb-confirmation__detail">
                    <span class="tb-confirmation__detail-label"><?php esc_html_e('Vehicle', 'transfers-booking'); ?></span>
                    <span class="tb-confirmation__detail-value" id="tb-confirmation-vehicle"></span>
                </div>
                <div class="tb-confirmation__detail">
                    <span class="tb-confirmation__detail-label"><?php esc_html_e('Passengers', 'transfers-booking'); ?></span>
                    <span class="tb-confirmation__detail-value" id="tb-confirmation-passengers"></span>
                </div>
                <div class="tb-confirmation__detail">
                    <span class="tb-confirmation__detail-label"><?php esc_html_e('Luggage', 'transfers-booking'); ?></span>
                    <span class="tb-confirmation__detail-value" id="tb-confirmation-luggage"></span>
                </div>
            </div>
        </div>

        <!-- Payment card -->
        <div class="tb-confirmation__card">
            <h3 class="tb-confirmation__card-title"><?php esc_html_e('Payment', 'transfers-booking'); ?></h3>
            <div class="tb-confirmation__payment-lines" id="tb-confirmation-payment-lines">
                <div class="tb-confirmation__payment-line">
                    <span><?php esc_html_e('Paid online', 'transfers-booking'); ?></span>
                    <span id="tb-confirmation-paid"></span>
                </div>
                <div class="tb-confirmation__payment-line" id="tb-confirmation-discount-row" style="display:none;">
                    <span><?php esc_html_e('Discount', 'transfers-booking'); ?></span>
                    <span id="tb-confirmation-discount" class="tb-confirmation__discount"></span>
                </div>
                <div class="tb-confirmation__payment-line" id="tb-confirmation-due-row" style="display:none;">
                    <span><?php esc_html_e('Due to driver', 'transfers-booking'); ?></span>
                    <span id="tb-confirmation-due"></span>
                </div>
                <div class="tb-confirmation__payment-line tb-confirmation__payment-line--total">
                    <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                    <span id="tb-confirmation-total"></span>
                </div>
            </div>
        </div>

        <!-- What's Next card -->
        <div class="tb-confirmation__card">
            <h3 class="tb-confirmation__card-title"><?php esc_html_e("What's Next", 'transfers-booking'); ?></h3>
            <div class="tb-confirmation__timeline">
                <div class="tb-confirmation__timeline-item">
                    <div class="tb-confirmation__timeline-dot">1</div>
                    <div class="tb-confirmation__timeline-content">
                        <strong><?php esc_html_e('Check your email', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('You will receive a confirmation email with all details and your driver\'s contact.', 'transfers-booking'); ?></p>
                    </div>
                </div>
                <div class="tb-confirmation__timeline-item">
                    <div class="tb-confirmation__timeline-dot">2</div>
                    <div class="tb-confirmation__timeline-content">
                        <strong><?php esc_html_e('Driver contacts you', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('24 hours before your pickup, your driver will send you a WhatsApp message with their details.', 'transfers-booking'); ?></p>
                    </div>
                </div>
                <div class="tb-confirmation__timeline-item">
                    <div class="tb-confirmation__timeline-dot">3</div>
                    <div class="tb-confirmation__timeline-content">
                        <strong><?php esc_html_e('Meet your driver', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('Your driver will meet you at the pickup point with a name sign. Sit back and enjoy the ride!', 'transfers-booking'); ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action buttons -->
        <div class="tb-confirmation__actions">
            <button type="button" id="tb-confirmation-print" class="tb-confirmation__btn tb-confirmation__btn--outline">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6V1h8v5M4 12H2V8h12v4h-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="10" width="8" height="4" stroke="currentColor" stroke-width="1.2"/></svg>
                <?php esc_html_e('Print', 'transfers-booking'); ?>
            </button>
            <a href="/" class="tb-confirmation__btn tb-confirmation__btn--primary">
                <?php esc_html_e('Book Another Transfer', 'transfers-booking'); ?>
            </a>
        </div>
    </div>
</div>
