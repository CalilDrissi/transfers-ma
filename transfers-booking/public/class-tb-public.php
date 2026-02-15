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
        // Original booking widget
        if ($this->page_has_shortcode('transfers_booking')) {
            wp_enqueue_style(
                'tb-booking',
                TB_PLUGIN_URL . 'public/css/tb-booking.css',
                [],
                $this->version
            );

            if (is_rtl()) {
                wp_enqueue_style(
                    'tb-rtl',
                    TB_PLUGIN_URL . 'public/css/tb-rtl.css',
                    ['tb-booking'],
                    $this->version
                );
            }

            $primary = esc_attr(TB_Settings::get('tb_primary_color'));
            $accent = esc_attr(TB_Settings::get('tb_accent_color'));
            $dynamic_css = ":root { --tb-primary: {$primary}; --tb-accent: {$accent}; }";
            wp_add_inline_style('tb-booking', $dynamic_css);
        }

        // Inject CSS custom properties on all plugin pages
        $any_shortcode = $this->page_has_shortcode('transfers_search')
            || $this->page_has_shortcode('transfers_results')
            || $this->page_has_shortcode('transfers_checkout')
            || $this->page_has_shortcode('transfers_confirmation')
            || $this->page_has_shortcode('tours_listing')
            || $this->page_has_shortcode('tour_detail');

        if ($any_shortcode && !$this->page_has_shortcode('transfers_booking')) {
            $primary = esc_attr(TB_Settings::get('tb_primary_color'));
            $accent = esc_attr(TB_Settings::get('tb_accent_color'));
            $dynamic_css = ":root { --tb-primary: {$primary}; --tb-accent: {$accent}; }";
            // Add to whichever style enqueues first below
            add_action('wp_head', function () use ($dynamic_css) {
                echo '<style id="tb-custom-props">' . $dynamic_css . '</style>';
            });
        }

        // Search widget
        if ($this->page_has_shortcode('transfers_search')) {
            wp_enqueue_style(
                'tb-search-widget',
                TB_PLUGIN_URL . 'public/css/tb-search-widget.css',
                [],
                $this->version
            );
        }

        // Results page
        if ($this->page_has_shortcode('transfers_results')) {
            wp_enqueue_style(
                'tb-results',
                TB_PLUGIN_URL . 'public/css/tb-results.css',
                [],
                $this->version
            );
        }

        // Checkout page
        if ($this->page_has_shortcode('transfers_checkout')) {
            wp_enqueue_style(
                'tb-checkout',
                TB_PLUGIN_URL . 'public/css/tb-checkout.css',
                [],
                $this->version
            );
        }

        // Confirmation page
        if ($this->page_has_shortcode('transfers_confirmation')) {
            wp_enqueue_style(
                'tb-confirmation',
                TB_PLUGIN_URL . 'public/css/tb-confirmation.css',
                [],
                $this->version
            );
        }

        // Tours listing & detail
        if ($this->page_has_shortcode('tours_listing') || $this->page_has_shortcode('tour_detail')) {
            wp_enqueue_style(
                'tb-tours',
                TB_PLUGIN_URL . 'public/css/tb-tours.css',
                [],
                $this->version
            );
        }
    }

    public function enqueue_scripts() {
        $has_booking      = $this->page_has_shortcode('transfers_booking');
        $has_search       = $this->page_has_shortcode('transfers_search');
        $has_results      = $this->page_has_shortcode('transfers_results');
        $has_checkout     = $this->page_has_shortcode('transfers_checkout');
        $has_confirmation = $this->page_has_shortcode('transfers_confirmation');
        $has_tours        = $this->page_has_shortcode('tours_listing');
        $has_tour_detail  = $this->page_has_shortcode('tour_detail');

        $needs_scripts = $has_booking || $has_search || $has_results || $has_checkout || $has_confirmation || $has_tours || $has_tour_detail;

        if (!$needs_scripts) {
            return;
        }

        // Google Maps (shared — search, results, checkout)
        $gmaps_key = TB_Settings::get('tb_google_maps_api_key');
        if ($gmaps_key && ($has_search || $has_results || $has_checkout || $has_booking)) {
            wp_enqueue_script(
                'google-maps',
                'https://maps.googleapis.com/maps/api/js?key=' . urlencode($gmaps_key) . '&libraries=places&callback=Function.prototype',
                [],
                null,
                true
            );
        }

        // Ensure tb-utils and tb-api are loaded for pages that need the API
        $needs_api = $has_results || $has_checkout || $has_confirmation || $has_tours || $has_tour_detail;
        if ($needs_api && !$has_booking) {
            wp_enqueue_script(
                'tb-utils',
                TB_PLUGIN_URL . 'public/js/tb-utils.js',
                [],
                $this->version,
                true
            );
            wp_enqueue_script(
                'tb-api',
                TB_PLUGIN_URL . 'public/js/tb-api.js',
                ['tb-utils'],
                $this->version,
                true
            );
        }

        // Localize config on whichever script loads first
        $config_handle = null;

        // Original booking widget scripts
        if ($has_booking) {
            wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);

            $scripts = ['tb-utils', 'tb-api', 'tb-state', 'tb-step1', 'tb-step2', 'tb-step3', 'tb-wizard'];
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
            $config_handle = 'tb-api';
        }

        // Search widget scripts
        if ($has_search) {
            $deps = $gmaps_key ? ['google-maps'] : [];
            wp_enqueue_script(
                'tb-search-widget',
                TB_PLUGIN_URL . 'public/js/tb-search-widget.js',
                $deps,
                $this->version,
                true
            );
            if (!$config_handle) {
                $config_handle = 'tb-search-widget';
            }
        }

        // Results page scripts
        if ($has_results) {
            $results_deps = ['tb-api'];
            if ($gmaps_key) {
                $results_deps[] = 'google-maps';
            }
            wp_enqueue_script(
                'tb-results',
                TB_PLUGIN_URL . 'public/js/tb-results.js',
                $results_deps,
                $this->version,
                true
            );
            if (!$config_handle) {
                $config_handle = 'tb-api';
            }
        }

        // Checkout page scripts
        if ($has_checkout) {
            wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);

            // PayPal SDK (if configured)
            $paypal_client_id = TB_Settings::get('tb_paypal_client_id');
            if ($paypal_client_id) {
                wp_enqueue_script(
                    'paypal-sdk',
                    'https://www.paypal.com/sdk/js?client-id=' . urlencode($paypal_client_id) . '&currency=MAD',
                    [],
                    null,
                    true
                );
            }

            $checkout_deps = ['tb-api', 'stripe-js'];
            if ($paypal_client_id) {
                $checkout_deps[] = 'paypal-sdk';
            }

            wp_enqueue_script(
                'tb-checkout',
                TB_PLUGIN_URL . 'public/js/tb-checkout.js',
                $checkout_deps,
                $this->version,
                true
            );
            if (!$config_handle) {
                $config_handle = 'tb-api';
            }
        }

        // Confirmation page scripts
        if ($has_confirmation) {
            wp_enqueue_script(
                'tb-confirmation',
                TB_PLUGIN_URL . 'public/js/tb-confirmation.js',
                ['tb-api'],
                $this->version,
                true
            );
            if (!$config_handle) {
                $config_handle = 'tb-api';
            }
        }

        // Tours listing scripts
        if ($has_tours) {
            wp_enqueue_script(
                'tb-tours-listing',
                TB_PLUGIN_URL . 'public/js/tb-tours-listing.js',
                ['tb-api'],
                $this->version,
                true
            );
            if (!$config_handle) {
                $config_handle = 'tb-api';
            }
        }

        // Tour detail scripts
        if ($has_tour_detail) {
            wp_enqueue_script(
                'tb-tour-detail',
                TB_PLUGIN_URL . 'public/js/tb-tour-detail.js',
                ['tb-api'],
                $this->version,
                true
            );
            if (!$config_handle) {
                $config_handle = 'tb-api';
            }
        }

        // Pass config to JavaScript
        if ($config_handle) {
            wp_localize_script($config_handle, 'tbConfig', $this->get_js_config());
        }
    }

    private function get_js_config() {
        return [
            'ajaxUrl'              => admin_url('admin-ajax.php'),
            'nonce'                => wp_create_nonce('tb_api_nonce'),
            'stripePublishableKey' => TB_Settings::get('tb_stripe_publishable_key'),
            'paypalClientId'       => TB_Settings::get('tb_paypal_client_id'),
            'googleMapsApiKey'     => TB_Settings::get('tb_google_maps_api_key'),
            'currencySymbol'       => TB_Settings::get('tb_currency_symbol'),
            'currencyPosition'     => TB_Settings::get('tb_currency_position'),
            'enableRoundTrip'      => (bool) TB_Settings::get('tb_enable_round_trip'),
            'enableFlightNumber'   => (bool) TB_Settings::get('tb_enable_flight_number'),
            'isRtl'                => is_rtl(),
            'lang'                 => determine_locale(),
            'resultsPageUrl'       => TB_Settings::get('tb_results_page_url'),
            'toursPageUrl'         => TB_Settings::get('tb_tours_page_url'),
            'checkoutPageUrl'      => TB_Settings::get('tb_checkout_page_url'),
            'confirmationPageUrl'  => TB_Settings::get('tb_confirmation_page_url'),
            'transferTypes'        => [
                ['value' => 'airport_pickup',  'label' => __('Airport Pickup', 'transfers-booking')],
                ['value' => 'airport_dropoff', 'label' => __('Airport Drop-off', 'transfers-booking')],
                ['value' => 'city_to_city',    'label' => __('City to City', 'transfers-booking')],
                ['value' => 'port_transfer',   'label' => __('Port Transfer', 'transfers-booking')],
            ],
            'i18n' => [
                // Original strings
                'selectPickup'       => __('Select pickup location', 'transfers-booking'),
                'selectDropoff'      => __('Select drop-off location', 'transfers-booking'),
                'selectType'         => __('Please select a transfer type', 'transfers-booking'),
                'selectDatetime'     => __('Please select date and time', 'transfers-booking'),
                'selectVehicle'      => __('Please select a vehicle', 'transfers-booking'),
                'required'           => __('This field is required', 'transfers-booking'),
                'invalidEmail'       => __('Please enter a valid email', 'transfers-booking'),
                'invalidPhone'       => __('Please enter a valid phone number', 'transfers-booking'),
                'loading'            => __('Loading...', 'transfers-booking'),
                'processing'         => __('Processing...', 'transfers-booking'),
                'noVehicles'         => __('No vehicles available for this route.', 'transfers-booking'),
                'errorGeneric'       => __('Something went wrong. Please try again.', 'transfers-booking'),
                'paymentFailed'      => __('Payment failed. Please try again.', 'transfers-booking'),
                'distance'           => __('Distance', 'transfers-booking'),
                'duration'           => __('Est. Duration', 'transfers-booking'),
                'passengers'         => __('passengers', 'transfers-booking'),
                'bags'               => __('bags', 'transfers-booking'),
                'totalPrice'         => __('total price', 'transfers-booking'),
                'perItem'            => __('/each', 'transfers-booking'),
                'returnDateRequired' => __('Return date is required for round trips', 'transfers-booking'),
                // Search widget strings
                'transfers'          => __('Transfers', 'transfers-booking'),
                'byTheHour'          => __('By the Hour', 'transfers-booking'),
                'dayTrips'           => __('Day Trips', 'transfers-booking'),
                'from'               => __('From', 'transfers-booking'),
                'to'                 => __('To', 'transfers-booking'),
                'date'               => __('Date', 'transfers-booking'),
                'return'             => __('Return', 'transfers-booking'),
                'addReturn'          => __('Add return', 'transfers-booking'),
                'search'             => __('Search', 'transfers-booking'),
                'passengersLabel'    => __('Passengers', 'transfers-booking'),
                'passenger'          => __('Passenger', 'transfers-booking'),
                'bagsLabel'          => __('Bags', 'transfers-booking'),
                'bag'                => __('Bag', 'transfers-booking'),
                'participantsLabel'  => __('Participants', 'transfers-booking'),
                'participant'        => __('Participant', 'transfers-booking'),
                'adults'             => __('Adults', 'transfers-booking'),
                'children'           => __('Children', 'transfers-booking'),
                'checkedBags'        => __('Checked bags', 'transfers-booking'),
                'handLuggage'        => __('Hand luggage', 'transfers-booking'),
                'freeCancellation'   => __('Free cancellation 24h', 'transfers-booking'),
                'googleRating'       => __('4.9/5 Google', 'transfers-booking'),
                'securePayment'      => __('Secure payment', 'transfers-booking'),
                // Results page strings
                'searching'          => __('Searching for available vehicles...', 'transfers-booking'),
                'modify'             => __('Modify', 'transfers-booking'),
                'updateSearch'       => __('Update Search', 'transfers-booking'),
                'cancel'             => __('Cancel', 'transfers-booking'),
                'bookNow'            => __('Book Now', 'transfers-booking'),
                'popular'            => __('Popular', 'transfers-booking'),
                'orSimilar'          => __('or similar', 'transfers-booking'),
                'deposit'            => __('Deposit', 'transfers-booking'),
                'addExtras'          => __('Add Extras', 'transfers-booking'),
                'backToSearch'       => __('Back to Search', 'transfers-booking'),
                'route'              => __('Route', 'transfers-booking'),
                'city'               => __('City', 'transfers-booking'),
                'hours'              => __('hours', 'transfers-booking'),
                'departureCity'      => __('Departure City', 'transfers-booking'),
                // Checkout strings
                'apply'              => __('Apply', 'transfers-booking'),
                'discount'           => __('Discount', 'transfers-booking'),
                'invalidCoupon'      => __('Invalid coupon code', 'transfers-booking'),
                'selectPayment'      => __('Please select a payment method', 'transfers-booking'),
                'payFull'            => __('Pay full amount', 'transfers-booking'),
                'payDeposit'         => __('Pay deposit only', 'transfers-booking'),
                'depositOnly'        => __('deposit', 'transfers-booking'),
                'remainingToDriver'  => __('Remaining', 'transfers-booking'),
                'toDriver'           => __('to driver', 'transfers-booking'),
                'payCash'            => __('Pay Cash to Driver', 'transfers-booking'),
                'cashDescription'    => __('Pay the full amount to your driver in cash', 'transfers-booking'),
                'payWithPaypal'      => __('Pay with PayPal', 'transfers-booking'),
                'paypalInfo'         => __('Click below to pay with PayPal.', 'transfers-booking'),
                'vehicle'            => __('Vehicle', 'transfers-booking'),
                // Confirmation strings
                'bookingNotFound'    => __('Booking not found', 'transfers-booking'),
                // Tours strings
                'days'               => __('days', 'transfers-booking'),
                'day'                => __('day', 'transfers-booking'),
                'group'              => __('group', 'transfers-booking'),
                'person'             => __('person', 'transfers-booking'),
            ],
        ];
    }

    private function page_has_shortcode($shortcode = 'transfers_booking') {
        global $post;
        if (!is_a($post, 'WP_Post')) {
            return false;
        }
        return has_shortcode($post->post_content, $shortcode);
    }
}
