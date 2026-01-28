<?php
/**
 * Main plugin orchestrator class.
 * Loads dependencies and registers all hooks.
 */

defined('ABSPATH') || exit;

class Transfers_Booking {

    protected $plugin_name = 'transfers-booking';
    protected $version;

    public function __construct() {
        $this->version = TB_VERSION;
        $this->load_dependencies();
    }

    private function load_dependencies() {
        require_once TB_PLUGIN_DIR . 'includes/class-tb-settings.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-api-proxy.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-shortcode.php';
        require_once TB_PLUGIN_DIR . 'admin/class-tb-admin.php';
        require_once TB_PLUGIN_DIR . 'public/class-tb-public.php';
    }

    public function run() {
        // Load text domain
        add_action('init', [$this, 'load_textdomain']);

        // Admin hooks
        $admin = new TB_Admin($this->plugin_name, $this->version);
        add_action('admin_menu', [$admin, 'add_settings_page']);
        add_action('admin_init', [$admin, 'register_settings']);
        add_action('admin_enqueue_scripts', [$admin, 'enqueue_styles']);

        // Public hooks
        $public = new TB_Public($this->plugin_name, $this->version);
        add_action('wp_enqueue_scripts', [$public, 'enqueue_styles']);
        add_action('wp_enqueue_scripts', [$public, 'enqueue_scripts']);

        // Shortcode
        $shortcode = new TB_Shortcode();
        add_shortcode('transfers_booking', [$shortcode, 'render']);

        // AJAX proxy (both logged-in and logged-out users)
        $api_proxy = new TB_API_Proxy();
        add_action('wp_ajax_tb_api_proxy', [$api_proxy, 'handle_request']);
        add_action('wp_ajax_nopriv_tb_api_proxy', [$api_proxy, 'handle_request']);
    }

    public function load_textdomain() {
        load_plugin_textdomain(
            'transfers-booking',
            false,
            dirname(TB_PLUGIN_BASENAME) . '/languages/'
        );
    }
}
