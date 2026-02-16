<?php
/**
 * Rental checkout page shortcode.
 * Usage: [rental_checkout]
 */

defined('ABSPATH') || exit;

class TB_Rental_Checkout_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/rental-checkout.php';
        return ob_get_clean();
    }
}
