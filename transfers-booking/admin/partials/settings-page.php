<?php defined('ABSPATH') || exit; ?>

<div class="wrap tb-settings">
    <h1><?php esc_html_e('Transfers.ma Booking Settings', 'transfers-booking'); ?></h1>

    <div class="tb-settings-header">
        <p><?php esc_html_e('Configure the booking widget. Use the shortcode', 'transfers-booking'); ?>
        <code>[transfers_booking]</code>
        <?php esc_html_e('to embed the booking form on any page.', 'transfers-booking'); ?></p>
    </div>

    <form method="post" action="options.php">
        <?php
        settings_fields('transfers-booking');
        do_settings_sections('transfers-booking');
        submit_button();
        ?>
    </form>
</div>
