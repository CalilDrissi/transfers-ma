<?php
/**
 * Rental results page shortcode.
 * Usage: [rental_results]
 */

defined('ABSPATH') || exit;

class TB_Rental_Results_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/rental-results.php';
        return ob_get_clean();
    }
}
