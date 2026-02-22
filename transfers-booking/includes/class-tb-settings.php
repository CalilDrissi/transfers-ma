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
            'tb_tours_page_url'                => '/tours/',
            'tb_rental_results_page_url'       => '/rental-results/',
            'tb_rental_checkout_page_url'      => '/rental-checkout/',
            'tb_rental_confirmation_page_url'  => '/rental-confirmed/',
            'tb_contact_phone'                 => '',
            'tb_contact_email'                 => '',
            'tb_contact_whatsapp'              => '',
            'tb_no_route_message'              => 'This route is not currently available for online booking. Please contact us for a custom quote.',
            'tb_show_no_route_message'         => '',
            'tb_enable_debug_log'              => '',
            'tb_enable_cash'                   => '',
            'tb_enable_stripe'                 => '1',
            'tb_enable_paypal'                 => '',
        ];
    }

    public static function get($key) {
        $defaults = self::get_defaults();
        return get_option($key, isset($defaults[$key]) ? $defaults[$key] : '');
    }

    /**
     * Get a translatable setting value (WPML → Polylang → raw).
     */
    public static function get_translated($key) {
        $value = self::get($key);
        if (!$value) {
            return $value;
        }
        // WPML
        if (function_exists('icl_t')) {
            return icl_t('transfers-booking', $key, $value);
        }
        // Polylang
        if (function_exists('pll__')) {
            return pll__($value);
        }
        return $value;
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
