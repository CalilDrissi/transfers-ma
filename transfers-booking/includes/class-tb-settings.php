<?php
/**
 * Plugin settings definitions.
 * Provides default values and option keys.
 */

defined('ABSPATH') || exit;

class TB_Settings {

    public static function get_defaults() {
        return [
            'tb_api_base_url'           => 'https://api.transfers.ma',
            'tb_stripe_publishable_key' => '',
            'tb_google_maps_api_key'    => '',
            'tb_primary_color'          => '#1a1a2e',
            'tb_accent_color'           => '#e94560',
            'tb_currency_symbol'        => 'MAD',
            'tb_currency_position'      => 'after',
            'tb_enable_round_trip'      => '1',
            'tb_enable_flight_number'   => '1',
        ];
    }

    public static function get($key) {
        $defaults = self::get_defaults();
        return get_option($key, isset($defaults[$key]) ? $defaults[$key] : '');
    }
}
