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

        // Ensure CSS + JS are loaded (page builders like Elementor bypass wp_enqueue_scripts detection)
        if (!wp_style_is('tb-booking', 'enqueued')) {
            wp_enqueue_style('tb-booking', TB_PLUGIN_URL . 'public/css/tb-booking.css', [], TB_VERSION);
            $primary = esc_attr(TB_Settings::get('tb_primary_color'));
            $accent = esc_attr(TB_Settings::get('tb_accent_color'));
            wp_add_inline_style('tb-booking', ":root { --tb-primary: {$primary}; --tb-accent: {$accent}; }");
        }
        $gmaps_key = TB_Settings::get('tb_google_maps_api_key');
        if ($gmaps_key && !wp_script_is('google-maps', 'enqueued')) {
            wp_enqueue_script('google-maps', 'https://maps.googleapis.com/maps/api/js?key=' . urlencode($gmaps_key) . '&libraries=places&callback=Function.prototype', [], null, true);
        }
        $deps = $gmaps_key ? ['google-maps'] : [];
        foreach (['tb-utils', 'tb-api', 'tb-state', 'tb-wizard', 'tb-step1', 'tb-step2', 'tb-step3'] as $handle) {
            if (!wp_script_is($handle, 'enqueued')) {
                wp_enqueue_script($handle, TB_PLUGIN_URL . "public/js/{$handle}.js", $deps, TB_VERSION, true);
                $deps = [$handle];
            }
        }
        if (!did_action('tb_config_localized')) {
            wp_localize_script('tb-utils', 'tbConfig', TB_Public::get_js_config_static());
            do_action('tb_config_localized');
        }
        // Stripe for payment
        if (TB_Settings::get('tb_stripe_publishable_key') && !wp_script_is('stripe-js', 'enqueued')) {
            wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);
        }

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
