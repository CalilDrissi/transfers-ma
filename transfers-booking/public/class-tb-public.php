<?php
/**
 * Public-facing functionality.
 * Enqueues scripts and styles only on pages with the shortcode.
 */

defined('ABSPATH') || exit;

class TB_Public {

    private $plugin_name;
    private $version;

    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }

    public function enqueue_styles() {
        if (!$this->page_has_shortcode()) {
            return;
        }

        wp_enqueue_style(
            'tb-booking',
            TB_PLUGIN_URL . 'public/css/tb-booking.css',
            [],
            $this->version
        );

        // RTL stylesheet
        if (is_rtl()) {
            wp_enqueue_style(
                'tb-rtl',
                TB_PLUGIN_URL . 'public/css/tb-rtl.css',
                ['tb-booking'],
                $this->version
            );
        }

        // Inject custom colors from settings
        $primary = esc_attr(TB_Settings::get('tb_primary_color'));
        $accent = esc_attr(TB_Settings::get('tb_accent_color'));
        $dynamic_css = ":root { --tb-primary: {$primary}; --tb-accent: {$accent}; }";
        wp_add_inline_style('tb-booking', $dynamic_css);
    }

    public function enqueue_scripts() {
        if (!$this->page_has_shortcode()) {
            return;
        }

        // Google Maps (optional)
        $gmaps_key = TB_Settings::get('tb_google_maps_api_key');
        if ($gmaps_key) {
            wp_enqueue_script(
                'google-maps',
                'https://maps.googleapis.com/maps/api/js?key=' . urlencode($gmaps_key) . '&libraries=places&callback=Function.prototype',
                [],
                null,
                true
            );
        }

        // Stripe.js
        wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);

        // Plugin scripts in dependency order
        $scripts = [
            'tb-utils',
            'tb-api',
            'tb-state',
            'tb-step1',
            'tb-step2',
            'tb-step3',
            'tb-wizard',
        ];

        $prev_handle = 'stripe-js';
        foreach ($scripts as $handle) {
            wp_enqueue_script(
                $handle,
                TB_PLUGIN_URL . 'public/js/' . $handle . '.js',
                [$prev_handle],
                $this->version,
                true
            );
            $prev_handle = $handle;
        }

        // Pass config to JavaScript
        wp_localize_script('tb-api', 'tbConfig', $this->get_js_config());
    }

    private function get_js_config() {
        return [
            'ajaxUrl'              => admin_url('admin-ajax.php'),
            'nonce'                => wp_create_nonce('tb_api_nonce'),
            'stripePublishableKey' => TB_Settings::get('tb_stripe_publishable_key'),
            'googleMapsApiKey'     => TB_Settings::get('tb_google_maps_api_key'),
            'currencySymbol'       => TB_Settings::get('tb_currency_symbol'),
            'currencyPosition'     => TB_Settings::get('tb_currency_position'),
            'enableRoundTrip'      => (bool) TB_Settings::get('tb_enable_round_trip'),
            'enableFlightNumber'   => (bool) TB_Settings::get('tb_enable_flight_number'),
            'isRtl'                => is_rtl(),
            'transferTypes'        => [
                ['value' => 'airport_pickup',  'label' => __('Airport Pickup', 'transfers-booking')],
                ['value' => 'airport_dropoff', 'label' => __('Airport Drop-off', 'transfers-booking')],
                ['value' => 'city_to_city',    'label' => __('City to City', 'transfers-booking')],
                ['value' => 'port_transfer',   'label' => __('Port Transfer', 'transfers-booking')],
            ],
            'i18n' => [
                'selectPickup'     => __('Select pickup location', 'transfers-booking'),
                'selectDropoff'    => __('Select drop-off location', 'transfers-booking'),
                'selectType'       => __('Please select a transfer type', 'transfers-booking'),
                'selectDatetime'   => __('Please select date and time', 'transfers-booking'),
                'selectVehicle'    => __('Please select a vehicle', 'transfers-booking'),
                'required'         => __('This field is required', 'transfers-booking'),
                'invalidEmail'     => __('Please enter a valid email', 'transfers-booking'),
                'invalidPhone'     => __('Please enter a valid phone number', 'transfers-booking'),
                'loading'          => __('Loading...', 'transfers-booking'),
                'processing'       => __('Processing...', 'transfers-booking'),
                'noVehicles'       => __('No vehicles available for this route.', 'transfers-booking'),
                'errorGeneric'     => __('Something went wrong. Please try again.', 'transfers-booking'),
                'paymentFailed'    => __('Payment failed. Please try again.', 'transfers-booking'),
                'distance'         => __('Distance', 'transfers-booking'),
                'duration'         => __('Est. Duration', 'transfers-booking'),
                'passengers'       => __('passengers', 'transfers-booking'),
                'bags'             => __('bags', 'transfers-booking'),
                'totalPrice'       => __('total price', 'transfers-booking'),
                'perItem'          => __('/each', 'transfers-booking'),
                'returnDateRequired' => __('Return date is required for round trips', 'transfers-booking'),
            ],
        ];
    }

    private function page_has_shortcode() {
        global $post;
        if (!is_a($post, 'WP_Post')) {
            return false;
        }
        return has_shortcode($post->post_content, 'transfers_booking');
    }
}
