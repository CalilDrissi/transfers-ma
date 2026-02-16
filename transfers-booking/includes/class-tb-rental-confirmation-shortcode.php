<?php
/**
 * Rental confirmation page shortcode.
 * Usage: [rental_confirmation]
 */

defined('ABSPATH') || exit;

class TB_Rental_Confirmation_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/rental-confirmation.php';
        return ob_get_clean();
    }
}
