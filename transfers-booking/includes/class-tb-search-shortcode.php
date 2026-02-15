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
            'theme'       => 'dark',
            'layout'      => 'horizontal',
            'show_tabs'   => 'true',
            'show_badges' => 'true',
            'headline'    => '',
        ], $atts, 'transfers_search');

        // Sanitize
        $theme       = in_array($atts['theme'], ['dark', 'light'], true) ? $atts['theme'] : 'dark';
        $layout      = in_array($atts['layout'], ['horizontal', 'vertical'], true) ? $atts['layout'] : 'horizontal';
        $show_tabs   = $atts['show_tabs'] !== 'false';
        $show_badges = $atts['show_badges'] !== 'false';
        $headline    = sanitize_text_field($atts['headline']);

        // Unique instance ID for scoped DOM queries
        $instance_id = wp_unique_id('tb-search-');

        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/search-widget.php';
        return ob_get_clean();
    }
}
