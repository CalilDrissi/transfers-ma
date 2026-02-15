<?php
/**
 * Confirmation page shortcode [transfers_confirmation].
 */

defined('ABSPATH') || exit;

class TB_Confirmation_Shortcode {

    public function render($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/confirmation-page.php';
        return ob_get_clean();
    }
}
