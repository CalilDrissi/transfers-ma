<?php defined('ABSPATH') || exit; ?>

<div class="tb-confirmation">
    <div class="tb-confirmation__icon">&#10003;</div>
    <h2 class="tb-confirmation__title"><?php esc_html_e('Booking Confirmed!', 'transfers-booking'); ?></h2>
    <p class="tb-confirmation__subtitle"><?php esc_html_e('Your transfer has been successfully booked.', 'transfers-booking'); ?></p>

    <div class="tb-confirmation__ref" id="tb-confirmation-ref">--</div>

    <p class="tb-confirmation__email">
        <?php esc_html_e('Confirmation email sent to', 'transfers-booking'); ?><br>
        <strong id="tb-confirmation-email">--</strong>
    </p>

    <!-- Receipt -->
    <div class="tb-receipt" id="tb-receipt">
        <h3 class="tb-receipt__title"><?php esc_html_e('Booking Receipt', 'transfers-booking'); ?></h3>
        <div class="tb-receipt__row">
            <span class="tb-receipt__label"><?php esc_html_e('Reference', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-ref">--</span>
        </div>
        <div class="tb-receipt__row">
            <span class="tb-receipt__label"><?php esc_html_e('Date & Time', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-datetime">--</span>
        </div>
        <div class="tb-receipt__row">
            <span class="tb-receipt__label"><?php esc_html_e('Pickup', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-pickup">--</span>
        </div>
        <div class="tb-receipt__row">
            <span class="tb-receipt__label"><?php esc_html_e('Drop-off', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-dropoff">--</span>
        </div>
        <div class="tb-receipt__row">
            <span class="tb-receipt__label"><?php esc_html_e('Vehicle', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-vehicle">--</span>
        </div>
        <div class="tb-receipt__row">
            <span class="tb-receipt__label"><?php esc_html_e('Passengers', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-passengers">--</span>
        </div>
        <div class="tb-receipt__row">
            <span class="tb-receipt__label"><?php esc_html_e('Payment', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-payment">--</span>
        </div>
        <div class="tb-receipt__divider"></div>
        <div class="tb-receipt__row tb-receipt__row--total">
            <span class="tb-receipt__label"><?php esc_html_e('Total', 'transfers-booking'); ?></span>
            <span class="tb-receipt__value" id="tb-receipt-total">--</span>
        </div>
        <button type="button" id="tb-download-receipt" class="tb-btn tb-btn--outline tb-btn--full">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M8 2v8M4 7l4 4 4-4"/><path d="M2 12v2h12v-2"/></svg>
            <?php esc_html_e('Download Receipt', 'transfers-booking'); ?>
        </button>
    </div>

    <button type="button" id="tb-book-another" class="tb-btn tb-btn--primary">
        <?php esc_html_e('Book Another Transfer', 'transfers-booking'); ?>
    </button>
</div>
