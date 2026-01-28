<?php
/**
 * Fired when the plugin is uninstalled.
 * Cleans up all plugin options from the database.
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

$options = [
    'tb_api_base_url',
    'tb_stripe_publishable_key',
    'tb_google_maps_api_key',
    'tb_primary_color',
    'tb_accent_color',
    'tb_currency_symbol',
    'tb_currency_position',
    'tb_enable_round_trip',
    'tb_enable_flight_number',
];

foreach ($options as $option) {
    delete_option($option);
}
