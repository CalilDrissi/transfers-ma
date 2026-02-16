<?php
/**
 * Rental search form shortcode.
 * Usage: [rental_search]
 */

defined('ABSPATH') || exit;

class TB_Rental_Search_Shortcode {

    public function render($atts) {
        $atts = shortcode_atts([
            'theme' => 'light',
        ], $atts, 'rental_search');

        $theme = in_array($atts['theme'], ['dark', 'light'], true) ? $atts['theme'] : 'light';

        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/rental-search.php';
        return ob_get_clean();
    }
}
