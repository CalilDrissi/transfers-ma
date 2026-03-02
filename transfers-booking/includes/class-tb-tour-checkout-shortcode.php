<?php
/**
 * Tour checkout page shortcode.
 * Usage: [tour_checkout]
 */

defined('ABSPATH') || exit;

class TB_Tour_Checkout_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/tours/tour-checkout.php';
        return ob_get_clean();
    }
}
