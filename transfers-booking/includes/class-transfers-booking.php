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
        require_once TB_PLUGIN_DIR . 'includes/class-tb-search-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-results-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-checkout-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-confirmation-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-tours-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-rental-search-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-rental-results-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-rental-checkout-shortcode.php';
        require_once TB_PLUGIN_DIR . 'includes/class-tb-rental-confirmation-shortcode.php';
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
        add_action('admin_enqueue_scripts', [$admin, 'enqueue_scripts']);

        // Public hooks
        $public = new TB_Public($this->plugin_name, $this->version);
        add_action('wp_enqueue_scripts', [$public, 'enqueue_styles']);
        add_action('wp_enqueue_scripts', [$public, 'enqueue_scripts']);

        // Shortcodes
        $shortcode = new TB_Shortcode();
        add_shortcode('transfers_booking', [$shortcode, 'render']);

        $search_shortcode = new TB_Search_Shortcode();
        add_shortcode('transfers_search', [$search_shortcode, 'render']);

        $results_shortcode = new TB_Results_Shortcode();
        add_shortcode('transfers_results', [$results_shortcode, 'render']);

        $checkout_shortcode = new TB_Checkout_Shortcode();
        add_shortcode('transfers_checkout', [$checkout_shortcode, 'render']);

        $confirmation_shortcode = new TB_Confirmation_Shortcode();
        add_shortcode('transfers_confirmation', [$confirmation_shortcode, 'render']);

        $tours_shortcode = new TB_Tours_Shortcode();
        add_shortcode('tours_listing', [$tours_shortcode, 'render_listing']);
        add_shortcode('tour_detail', [$tours_shortcode, 'render_detail']);

        $rental_search_shortcode = new TB_Rental_Search_Shortcode();
        add_shortcode('rental_search', [$rental_search_shortcode, 'render']);

        $rental_results_shortcode = new TB_Rental_Results_Shortcode();
        add_shortcode('rental_results', [$rental_results_shortcode, 'render']);

        $rental_checkout_shortcode = new TB_Rental_Checkout_Shortcode();
        add_shortcode('rental_checkout', [$rental_checkout_shortcode, 'render']);

        $rental_confirmation_shortcode = new TB_Rental_Confirmation_Shortcode();
        add_shortcode('rental_confirmation', [$rental_confirmation_shortcode, 'render']);

        // Rewrite rules for tour detail pages (/tours/{slug}/)
        add_action('init', [$this, 'register_rewrite_rules']);

        // AJAX proxy (both logged-in and logged-out users)
        $api_proxy = new TB_API_Proxy();
        add_action('wp_ajax_tb_api_proxy', [$api_proxy, 'handle_request']);
        add_action('wp_ajax_nopriv_tb_api_proxy', [$api_proxy, 'handle_request']);

        // Test connection AJAX (admin only)
        add_action('wp_ajax_tb_test_connection', [$api_proxy, 'test_connection']);
    }

    public function load_textdomain() {
        load_plugin_textdomain(
            'transfers-booking',
            false,
            dirname(TB_PLUGIN_BASENAME) . '/languages/'
        );
    }

    public function register_rewrite_rules() {
        // Match /tours/{slug}/ and pass tour_slug query var
        add_rewrite_rule(
            '^tours/([^/]+)/?$',
            'index.php?pagename=tour-detail&tour_slug=$matches[1]',
            'top'
        );
        add_rewrite_tag('%tour_slug%', '([^/]+)');
    }

    public static function activate() {
        // Set default option values
        TB_Settings::activate();

        // Flush rewrite rules on activation
        $instance = new self();
        $instance->register_rewrite_rules();
        flush_rewrite_rules();
    }

    public static function deactivate() {
        flush_rewrite_rules();
    }
}
