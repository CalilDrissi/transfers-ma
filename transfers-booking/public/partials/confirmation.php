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

    <button type="button" id="tb-book-another" class="tb-btn tb-btn--primary">
        <?php esc_html_e('Book Another Transfer', 'transfers-booking'); ?>
    </button>
</div>
