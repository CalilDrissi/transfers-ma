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
            'tb_api_key'                => '',
            'tb_stripe_publishable_key' => '',
            'tb_paypal_client_id'       => '',
            'tb_google_maps_api_key'    => '',
            'tb_primary_color'          => '#1a1a2e',
            'tb_accent_color'           => '#e94560',
            'tb_currency_symbol'        => 'MAD',
            'tb_currency_position'      => 'after',
            'tb_enable_round_trip'      => '1',
            'tb_enable_flight_number'   => '1',
            'tb_results_page_url'       => '/book-transfer/',
            'tb_tours_page_url'         => '/tours/',
            'tb_checkout_page_url'      => '/checkout/',
            'tb_confirmation_page_url'  => '/booking-confirmed/',
        ];
    }

    public static function get($key) {
        $defaults = self::get_defaults();
        return get_option($key, isset($defaults[$key]) ? $defaults[$key] : '');
    }

    /**
     * Set default option values on plugin activation.
     */
    public static function activate() {
        $defaults = self::get_defaults();
        foreach ($defaults as $key => $value) {
            if (get_option($key) === false) {
                add_option($key, $value);
            }
        }
    }
}
