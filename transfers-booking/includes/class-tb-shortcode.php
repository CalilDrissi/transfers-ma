<?php
/**
 * Shortcode registration and rendering.
 * Usage: [transfers_booking]
 */

defined('ABSPATH') || exit;

class TB_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/booking-widget.php';
        return ob_get_clean();
    }
}
