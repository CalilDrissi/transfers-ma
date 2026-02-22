<?php
/**
 * Admin page controller.
 * Handles settings page registration and rendering.
 */

defined('ABSPATH') || exit;

class TB_Admin {

    private $plugin_name;
    private $version;

    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }

    public function add_settings_page() {
        add_menu_page(
            __('Transfers Booking', 'transfers-booking'),
            __('Transfers', 'transfers-booking'),
            'manage_options',
            'transfers-booking',
            [$this, 'render_settings_page'],
            'dashicons-car',
            30
        );
    }

    public function register_settings() {
        // API Settings
        add_settings_section(
            'tb_api_section',
            __('API Connection', 'transfers-booking'),
            function () {
                echo '<p>' . esc_html__('Configure the connection to your Transfers.ma backend API.', 'transfers-booking') . '</p>';
            },
            'transfers-booking'
        );

        $this->add_field('tb_api_base_url', __('API Base URL', 'transfers-booking'), 'tb_api_section', 'url');
        $this->add_field('tb_api_key', __('API Key', 'transfers-booking'), 'tb_api_section', 'password',
            __('Your Transfers.ma API key. Generate one in the Django dashboard.', 'transfers-booking'));
        $this->add_field('tb_google_maps_api_key', __('Google Maps API Key', 'transfers-booking'), 'tb_api_section', 'text',
            __('Leave empty to fetch from the API automatically.', 'transfers-booking'));

        // Test Connection button (rendered after section)
        add_settings_field(
            'tb_test_connection',
            __('Test Connection', 'transfers-booking'),
            function () {
                echo '<button type="button" id="tb-test-connection" class="button button-secondary">';
                esc_html_e('Test Connection', 'transfers-booking');
                echo '</button>';
                echo '<span id="tb-test-result" style="margin-left:10px;"></span>';
            },
            'transfers-booking',
            'tb_api_section'
        );

        // Payment Settings
        add_settings_section(
            'tb_payment_section',
            __('Payment Settings', 'transfers-booking'),
            function () {
                echo '<p>' . esc_html__('Configure payment gateway credentials.', 'transfers-booking') . '</p>';
            },
            'transfers-booking'
        );

        $this->add_field('tb_stripe_publishable_key', __('Stripe Publishable Key', 'transfers-booking'), 'tb_payment_section', 'text',
            __('Starts with pk_', 'transfers-booking'));
        $this->add_field('tb_paypal_client_id', __('PayPal Client ID', 'transfers-booking'), 'tb_payment_section', 'text',
            __('PayPal app client ID for the JS SDK.', 'transfers-booking'));

        // Appearance Settings
        add_settings_section(
            'tb_appearance_section',
            __('Appearance', 'transfers-booking'),
            function () {
                echo '<p>' . esc_html__('Customize the look of the booking widget.', 'transfers-booking') . '</p>';
            },
            'transfers-booking'
        );

        $this->add_field('tb_primary_color', __('Primary Color', 'transfers-booking'), 'tb_appearance_section', 'color');
        $this->add_field('tb_accent_color', __('Accent Color', 'transfers-booking'), 'tb_appearance_section', 'color');
        $this->add_field('tb_currency_symbol', __('Currency Symbol', 'transfers-booking'), 'tb_appearance_section', 'text');
        $this->add_field('tb_currency_position', __('Currency Position', 'transfers-booking'), 'tb_appearance_section', 'select', '', [
            'before' => __('Before amount', 'transfers-booking'),
            'after'  => __('After amount', 'transfers-booking'),
        ]);

        // Feature Toggles
        add_settings_section(
            'tb_features_section',
            __('Features', 'transfers-booking'),
            function () {
                echo '<p>' . esc_html__('Enable or disable booking form features.', 'transfers-booking') . '</p>';
            },
            'transfers-booking'
        );

        $this->add_field('tb_enable_round_trip', __('Enable Round Trip', 'transfers-booking'), 'tb_features_section', 'checkbox');
        $this->add_field('tb_enable_flight_number', __('Enable Flight Number', 'transfers-booking'), 'tb_features_section', 'checkbox');
        $this->add_field('tb_enable_debug_log', __('Enable Debug Log', 'transfers-booking'), 'tb_features_section', 'checkbox',
            __('Log API errors to wp-content/plugins/transfers-booking/debug.log for troubleshooting.', 'transfers-booking'));

        // Contact & Messages
        add_settings_section(
            'tb_contact_section',
            __('Contact & Messages', 'transfers-booking'),
            function () {
                echo '<p>' . esc_html__('Contact info shown when a route is not available for online booking.', 'transfers-booking') . '</p>';
            },
            'transfers-booking'
        );

        $this->add_field('tb_contact_phone', __('Contact Phone', 'transfers-booking'), 'tb_contact_section', 'text',
            __('Phone number for customer inquiries (e.g. +212 5XX-XXXXXX).', 'transfers-booking'));
        $this->add_field('tb_contact_email', __('Contact Email', 'transfers-booking'), 'tb_contact_section', 'text',
            __('Email address for custom quote requests.', 'transfers-booking'));
        $this->add_field('tb_contact_whatsapp', __('WhatsApp Number', 'transfers-booking'), 'tb_contact_section', 'text',
            __('WhatsApp number with country code, no spaces (e.g. 212600000000).', 'transfers-booking'));
        $this->add_field('tb_show_no_route_message', __('Show "Contact Us" for Unknown Routes', 'transfers-booking'), 'tb_contact_section', 'checkbox',
            __('When enabled, routes without a pre-configured price will show a contact message instead of calculated prices.', 'transfers-booking'));
        $this->add_field('tb_no_route_message', __('No Route Message', 'transfers-booking'), 'tb_contact_section', 'textarea',
            __('Message shown when a route is not available. Supports basic HTML.', 'transfers-booking'));

        // Page URLs
        add_settings_section(
            'tb_pages_section',
            __('Page URLs', 'transfers-booking'),
            function () {
                echo '<p>' . esc_html__('Set the URLs for booking flow pages.', 'transfers-booking') . '</p>';
            },
            'transfers-booking'
        );

        $this->add_field('tb_tours_page_url', __('Tours Page URL', 'transfers-booking'), 'tb_pages_section', 'text',
            __('Tours listing page. Default: /tours/', 'transfers-booking'));
        $this->add_field('tb_rental_results_page_url', __('Rental Results Page URL', 'transfers-booking'), 'tb_pages_section', 'text',
            __('Page with [rental_results] shortcode. Default: /rental-results/', 'transfers-booking'));
        $this->add_field('tb_rental_checkout_page_url', __('Rental Checkout Page URL', 'transfers-booking'), 'tb_pages_section', 'text',
            __('Rental checkout page. Default: /rental-checkout/', 'transfers-booking'));
        $this->add_field('tb_rental_confirmation_page_url', __('Rental Confirmation Page URL', 'transfers-booking'), 'tb_pages_section', 'text',
            __('Rental booking confirmed page. Default: /rental-confirmed/', 'transfers-booking'));
    }

    private function add_field($id, $label, $section, $type = 'text', $description = '', $options = []) {
        register_setting('transfers-booking', $id, [
            'type'              => 'string',
            'sanitize_callback' => $type === 'textarea' ? 'wp_kses_post' : 'sanitize_text_field',
        ]);

        add_settings_field(
            $id,
            $label,
            function () use ($id, $type, $description, $options) {
                $value = TB_Settings::get($id);
                switch ($type) {
                    case 'url':
                    case 'text':
                        printf(
                            '<input type="%s" id="%s" name="%s" value="%s" class="regular-text">',
                            esc_attr($type === 'url' ? 'url' : 'text'),
                            esc_attr($id),
                            esc_attr($id),
                            esc_attr($value)
                        );
                        break;
                    case 'password':
                        printf(
                            '<input type="password" id="%s" name="%s" value="%s" class="regular-text" autocomplete="off">',
                            esc_attr($id),
                            esc_attr($id),
                            esc_attr($value)
                        );
                        break;
                    case 'color':
                        printf(
                            '<input type="color" id="%s" name="%s" value="%s">',
                            esc_attr($id),
                            esc_attr($id),
                            esc_attr($value)
                        );
                        break;
                    case 'checkbox':
                        printf(
                            '<input type="checkbox" id="%s" name="%s" value="1" %s>',
                            esc_attr($id),
                            esc_attr($id),
                            checked($value, '1', false)
                        );
                        break;
                    case 'textarea':
                        printf(
                            '<textarea id="%s" name="%s" rows="4" class="large-text">%s</textarea>',
                            esc_attr($id),
                            esc_attr($id),
                            esc_textarea($value)
                        );
                        break;
                    case 'select':
                        printf('<select id="%s" name="%s">', esc_attr($id), esc_attr($id));
                        foreach ($options as $opt_value => $opt_label) {
                            printf(
                                '<option value="%s" %s>%s</option>',
                                esc_attr($opt_value),
                                selected($value, $opt_value, false),
                                esc_html($opt_label)
                            );
                        }
                        echo '</select>';
                        break;
                }
                if ($description) {
                    printf('<p class="description">%s</p>', esc_html($description));
                }
            },
            'transfers-booking',
            $section
        );
    }

    public function render_settings_page() {
        include TB_PLUGIN_DIR . 'admin/partials/settings-page.php';
    }

    public function enqueue_styles($hook) {
        if ($hook !== 'toplevel_page_transfers-booking') {
            return;
        }
        wp_enqueue_style(
            'tb-admin',
            TB_PLUGIN_URL . 'admin/css/tb-admin.css',
            [],
            $this->version
        );
    }

    public function enqueue_scripts($hook) {
        if ($hook !== 'toplevel_page_transfers-booking') {
            return;
        }
        wp_enqueue_script(
            'tb-admin',
            TB_PLUGIN_URL . 'admin/js/tb-admin.js',
            ['jquery'],
            $this->version,
            true
        );
        wp_localize_script('tb-admin', 'tbAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('tb_api_nonce'),
            'i18n'    => [
                'testing'    => __('Testing...', 'transfers-booking'),
                'success'    => __('Connection successful!', 'transfers-booking'),
                'failed'     => __('Connection failed.', 'transfers-booking'),
            ],
        ]);
    }
}
