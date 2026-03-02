<?php
/**
 * Tour confirmation page shortcode.
 * Usage: [tour_confirmation]
 */

defined('ABSPATH') || exit;

class TB_Tour_Confirmation_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/tours/tour-confirmation.php';
        return ob_get_clean();
    }
}
