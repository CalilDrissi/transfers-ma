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
        add_options_page(
            __('Transfers Booking', 'transfers-booking'),
            __('Transfers Booking', 'transfers-booking'),
            'manage_options',
            'transfers-booking',
            [$this, 'render_settings_page']
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
        $this->add_field('tb_google_maps_api_key', __('Google Maps API Key', 'transfers-booking'), 'tb_api_section', 'text',
            __('Leave empty to fetch from the API automatically.', 'transfers-booking'));

        // Payment Settings
        add_settings_section(
            'tb_payment_section',
            __('Payment Settings', 'transfers-booking'),
            function () {
                echo '<p>' . esc_html__('Configure Stripe payment integration.', 'transfers-booking') . '</p>';
            },
            'transfers-booking'
        );

        $this->add_field('tb_stripe_publishable_key', __('Stripe Publishable Key', 'transfers-booking'), 'tb_payment_section', 'text',
            __('Starts with pk_', 'transfers-booking'));

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
    }

    private function add_field($id, $label, $section, $type = 'text', $description = '', $options = []) {
        register_setting('transfers-booking', $id, [
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
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
        if ($hook !== 'settings_page_transfers-booking') {
            return;
        }
        wp_enqueue_style(
            'tb-admin',
            TB_PLUGIN_URL . 'admin/css/tb-admin.css',
            [],
            $this->version
        );
    }
}
