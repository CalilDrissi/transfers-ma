<?php
/**
 * Shortcode registration and rendering.
 * Usage: [transfers_booking]
 */

defined('ABSPATH') || exit;

class TB_Shortcode {

    public function render($atts) {
        $atts = shortcode_atts([
            'lang'             => '',
            'fixed_origin'     => '',
            'fixed_origin_lat' => '',
            'fixed_origin_lng' => '',
        ], $atts, 'transfers_booking');

        $lang             = sanitize_text_field($atts['lang']);
        $fixed_origin     = sanitize_text_field($atts['fixed_origin']);
        $fixed_origin_lat = sanitize_text_field($atts['fixed_origin_lat']);
        $fixed_origin_lng = sanitize_text_field($atts['fixed_origin_lng']);

        // Switch locale if lang override is set
        $switched_locale = false;
        if ($lang && $lang !== determine_locale()) {
            switch_to_locale($lang);
            $switched_locale = true;
        }

        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/booking-widget.php';
        $output = ob_get_clean();

        if ($switched_locale) {
            restore_previous_locale();
        }

        return $output;
    }
}
