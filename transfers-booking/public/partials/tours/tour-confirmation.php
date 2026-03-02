<?php
/**
 * Tour confirmation page template.
 * Displays booking details after successful tour booking.
 */
defined('ABSPATH') || exit;
?>
<div id="tb-tour-confirmation" class="tb-tour-confirmation" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <!-- Loading state -->
    <div id="tb-tour-confirmation-loading" class="tb-tour-confirmation__loading">
        <div class="tb-tour-confirmation__spinner"></div>
        <p><?php esc_html_e('Loading booking details...', 'transfers-booking'); ?></p>
    </div>

    <!-- Error state -->
    <div id="tb-tour-confirmation-error" class="tb-tour-confirmation__error" style="display:none;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#EF4444" stroke-width="2"/><path d="M24 16v10M24 30v2" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/></svg>
        <h2><?php esc_html_e('Booking Not Found', 'transfers-booking'); ?></h2>
        <p id="tb-tour-confirmation-error-msg"><?php esc_html_e('We could not find this booking. Please check your reference number.', 'transfers-booking'); ?></p>
        <a href="/" class="tb-tour-confirmation__btn"><?php esc_html_e('Back to Home', 'transfers-booking'); ?></a>
    </div>

    <!-- Success content -->
    <div id="tb-tour-confirmation-content" class="tb-tour-confirmation__content" style="display:none;">

        <!-- Animated checkmark -->
        <div class="tb-tour-confirmation__icon">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="34" stroke="#10B981" stroke-width="3" class="tb-tour-confirmation__circle"/>
                <path d="M22 36l10 10 18-20" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="tb-tour-confirmation__check"/>
            </svg>
        </div>

        <h1 class="tb-tour-confirmation__title"><?php esc_html_e('Tour Confirmed!', 'transfers-booking'); ?></h1>

        <!-- Booking reference -->
        <div class="tb-tour-confirmation__ref">
            <span class="tb-tour-confirmation__ref-label"><?php esc_html_e('Booking Reference', 'transfers-booking'); ?></span>
            <div class="tb-tour-confirmation__ref-value" id="tb-tour-confirmation-ref" title="<?php esc_attr_e('Click to copy', 'transfers-booking'); ?>"></div>
            <span class="tb-tour-confirmation__ref-copied" id="tb-tour-confirmation-copied"><?php esc_html_e('Copied!', 'transfers-booking'); ?></span>
        </div>

        <!-- Tour Details Card -->
        <div class="tb-tour-confirmation__card">
            <h3 class="tb-tour-confirmation__card-title"><?php esc_html_e('Tour Details', 'transfers-booking'); ?></h3>
            <div class="tb-tour-confirmation__detail-grid">
                <div class="tb-tour-confirmation__detail">
                    <span class="tb-tour-confirmation__detail-label"><?php esc_html_e('Tour', 'transfers-booking'); ?></span>
                    <span class="tb-tour-confirmation__detail-value" id="tb-tour-confirmation-name"></span>
                </div>
                <div class="tb-tour-confirmation__detail">
                    <span class="tb-tour-confirmation__detail-label"><?php esc_html_e('Date', 'transfers-booking'); ?></span>
                    <span class="tb-tour-confirmation__detail-value" id="tb-tour-confirmation-date"></span>
                </div>
                <div class="tb-tour-confirmation__detail">
                    <span class="tb-tour-confirmation__detail-label"><?php esc_html_e('Participants', 'transfers-booking'); ?></span>
                    <span class="tb-tour-confirmation__detail-value" id="tb-tour-confirmation-pax"></span>
                </div>
                <div class="tb-tour-confirmation__detail" id="tb-tour-confirmation-private-row" style="display:none;">
                    <span class="tb-tour-confirmation__detail-label"><?php esc_html_e('Type', 'transfers-booking'); ?></span>
                    <span class="tb-tour-confirmation__detail-value"><?php esc_html_e('Private Tour', 'transfers-booking'); ?></span>
                </div>
            </div>
        </div>

        <!-- Pricing Card -->
        <div class="tb-tour-confirmation__card">
            <h3 class="tb-tour-confirmation__card-title"><?php esc_html_e('Payment', 'transfers-booking'); ?></h3>
            <div class="tb-tour-confirmation__payment-lines">
                <div class="tb-tour-confirmation__payment-line tb-tour-confirmation__payment-line--total">
                    <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                    <span id="tb-tour-confirmation-total"></span>
                </div>
                <div class="tb-tour-confirmation__payment-line">
                    <span><?php esc_html_e('Payment Method', 'transfers-booking'); ?></span>
                    <span id="tb-tour-confirmation-gateway"></span>
                </div>
            </div>
        </div>

        <!-- What's Next -->
        <div class="tb-tour-confirmation__card">
            <h3 class="tb-tour-confirmation__card-title"><?php esc_html_e("What's Next", 'transfers-booking'); ?></h3>
            <div class="tb-tour-confirmation__timeline">
                <div class="tb-tour-confirmation__timeline-item">
                    <div class="tb-tour-confirmation__timeline-dot">1</div>
                    <div class="tb-tour-confirmation__timeline-content">
                        <strong><?php esc_html_e('Check your email', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('You will receive a confirmation email with all the tour details.', 'transfers-booking'); ?></p>
                    </div>
                </div>
                <div class="tb-tour-confirmation__timeline-item">
                    <div class="tb-tour-confirmation__timeline-dot">2</div>
                    <div class="tb-tour-confirmation__timeline-content">
                        <strong><?php esc_html_e('Meet at pickup point', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('Meet at the pickup point on time with your booking reference.', 'transfers-booking'); ?></p>
                    </div>
                </div>
                <div class="tb-tour-confirmation__timeline-item">
                    <div class="tb-tour-confirmation__timeline-dot">3</div>
                    <div class="tb-tour-confirmation__timeline-content">
                        <strong><?php esc_html_e('Enjoy your tour', 'transfers-booking'); ?></strong>
                        <p><?php esc_html_e('Your guide will be waiting. Have an amazing experience!', 'transfers-booking'); ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action buttons -->
        <div class="tb-tour-confirmation__actions">
            <button type="button" id="tb-tour-confirmation-print" class="tb-tour-confirmation__btn tb-tour-confirmation__btn--outline">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6V1h8v5M4 12H2V8h12v4h-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="10" width="8" height="4" stroke="currentColor" stroke-width="1.2"/></svg>
                <?php esc_html_e('Print', 'transfers-booking'); ?>
            </button>
            <a href="<?php echo esc_url(TB_Settings::get('tb_tours_page_url') ?: '/tours/'); ?>" class="tb-tour-confirmation__btn tb-tour-confirmation__btn--primary">
                <?php esc_html_e('Browse Tours', 'transfers-booking'); ?>
            </a>
        </div>
    </div>
</div>
