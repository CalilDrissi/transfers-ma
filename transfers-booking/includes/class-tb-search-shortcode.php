<?php
/**
 * Search form shortcode.
 * Usage: [transfers_search theme="dark" layout="horizontal" show_tabs="true" show_badges="true" headline=""]
 * Multiple instances can appear on the same page.
 */

defined('ABSPATH') || exit;

class TB_Search_Shortcode {

    public function render($atts) {
        $atts = shortcode_atts([
            'theme'            => 'dark',
            'layout'           => 'horizontal',
            'show_tabs'        => 'true',
            'show_badges'      => 'true',
            'headline'         => '',
            'lang'             => '',
            'fixed_origin'     => '',
            'fixed_origin_lat' => '',
            'fixed_origin_lng' => '',
        ], $atts, 'transfers_search');

        // Sanitize
        $theme       = in_array($atts['theme'], ['dark', 'light'], true) ? $atts['theme'] : 'dark';
        $layout      = in_array($atts['layout'], ['horizontal', 'vertical'], true) ? $atts['layout'] : 'horizontal';
        $show_tabs   = $atts['show_tabs'] !== 'false';
        $show_badges = $atts['show_badges'] !== 'false';
        $headline    = sanitize_text_field($atts['headline']);
        $lang             = sanitize_text_field($atts['lang']);
        $fixed_origin     = sanitize_text_field($atts['fixed_origin']);
        $fixed_origin_lat = sanitize_text_field($atts['fixed_origin_lat']);
        $fixed_origin_lng = sanitize_text_field($atts['fixed_origin_lng']);

        // Ensure CSS + JS are loaded (page builders like Elementor bypass wp_enqueue_scripts detection)
        if (!wp_style_is('tb-search-widget', 'enqueued')) {
            wp_enqueue_style('tb-search-widget', TB_PLUGIN_URL . 'public/css/tb-search-widget.css', [], TB_VERSION);
        }

        // Google Maps for autocomplete
        $gmaps_key = TB_Settings::get('tb_google_maps_api_key');
        if ($gmaps_key && !wp_script_is('google-maps', 'enqueued')) {
            wp_enqueue_script('google-maps', 'https://maps.googleapis.com/maps/api/js?key=' . urlencode($gmaps_key) . '&libraries=places&callback=Function.prototype', [], null, true);
        }

        $search_deps = $gmaps_key ? ['google-maps'] : [];
        if (!wp_script_is('tb-search-widget', 'enqueued')) {
            wp_enqueue_script('tb-search-widget', TB_PLUGIN_URL . 'public/js/tb-search-widget.js', $search_deps, TB_VERSION, true);

            // Pass config to JS
            $public = new TB_Public();
            $config = $public->get_js_config_static();
            wp_localize_script('tb-search-widget', 'tbConfig', $config);
        }

        // Unique instance ID for scoped DOM queries
        $instance_id = wp_unique_id('tb-search-');

        // Switch locale if lang override is set
        $switched_locale = false;
        if ($lang && $lang !== determine_locale()) {
            switch_to_locale($lang);
            $switched_locale = true;
        }

        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/search-widget.php';
        $output = ob_get_clean();

        if ($switched_locale) {
            restore_previous_locale();
        }

        return $output;
    }
}
