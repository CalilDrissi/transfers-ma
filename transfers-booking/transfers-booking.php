<?php
/**
 * Plugin Name:     Transfers.ma Booking
 * Plugin URI:      https://transfers.ma
 * Description:     Client-facing transfer booking widget with 3-step wizard. Connects to Transfers.ma Django REST API.
 * Version:         2.3.1
 * Author:          Transfers.ma
 * Text Domain:     transfers-booking
 * Domain Path:     /languages
 * Requires PHP:    7.4
 * Requires at least: 5.8
 */

defined('ABSPATH') || exit;

define('TB_VERSION', '2.3.1');
define('TB_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('TB_PLUGIN_URL', plugin_dir_url(__FILE__));
define('TB_PLUGIN_BASENAME', plugin_basename(__FILE__));

require_once TB_PLUGIN_DIR . 'includes/class-transfers-booking.php';

// Activation / deactivation hooks for rewrite rules
register_activation_hook(__FILE__, ['Transfers_Booking', 'activate']);
register_deactivation_hook(__FILE__, ['Transfers_Booking', 'deactivate']);

function tb_run() {
    $plugin = new Transfers_Booking();
    $plugin->run();
}
tb_run();
