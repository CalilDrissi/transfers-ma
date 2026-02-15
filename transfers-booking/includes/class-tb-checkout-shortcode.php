<?php
/**
 * Checkout page shortcode [transfers_checkout].
 */

defined('ABSPATH') || exit;

class TB_Checkout_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/checkout-page.php';
        return ob_get_clean();
    }
}
