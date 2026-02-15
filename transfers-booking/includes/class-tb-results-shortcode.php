<?php
/**
 * Results page shortcode.
 * Usage: [transfers_results]
 */

defined('ABSPATH') || exit;

class TB_Results_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/results-page.php';
        return ob_get_clean();
    }
}
