<?php
/**
 * Tours shortcodes: [tours_listing] and [tour_detail].
 */

defined('ABSPATH') || exit;

class TB_Tours_Shortcode {

    public function render_listing($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/tours/tour-listing.php';
        return ob_get_clean();
    }

    public function render_detail($atts) {
        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/tours/tour-detail.php';
        return ob_get_clean();
    }
}
