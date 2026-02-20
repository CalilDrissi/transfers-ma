<?php
/**
 * AJAX API proxy.
 * Forwards requests from the browser to the Django API server-side.
 * Only whitelisted endpoints are allowed.
 */

defined('ABSPATH') || exit;

class TB_API_Proxy {

    private $allowed_endpoints = [
        'google_maps_config'  => ['method' => 'GET',  'path' => '/locations/google-maps-config/'],
        'get_pricing'         => ['method' => 'GET',  'path' => '/locations/routes/get_pricing/'],
        'get_extras'          => ['method' => 'GET',  'path' => '/transfers/extras/'],
        'get_categories'      => ['method' => 'GET',  'path' => '/vehicles/categories/'],
        'search_transfers'    => ['method' => 'GET',  'path' => '/locations/routes/get_pricing/'],
        'create_booking'      => ['method' => 'POST', 'path' => '/transfers/'],
        'get_booking_by_ref'  => ['method' => 'GET',  'path' => '/transfers/by-ref/', 'dynamic' => true],
        'create_payment'      => ['method' => 'POST', 'path' => '/payments/'],
        'confirm_payment'     => ['method' => 'POST', 'path' => '/payments/confirm/'],
        'get_gateways'        => ['method' => 'GET',  'path' => '/payments/gateways/'],
        'validate_coupon'     => ['method' => 'POST', 'path' => '/payments/coupons/validate/'],
        'get_trips'           => ['method' => 'GET',  'path' => '/trips/'],
        'get_trip_detail'     => ['method' => 'GET',  'path' => '/trips/', 'dynamic' => true],
        'get_trip_schedules'  => ['method' => 'GET',  'path' => '/trips/', 'dynamic' => true],
        'create_trip_booking' => ['method' => 'POST', 'path' => '/trips/bookings/'],
        // Car rental endpoints
        'rental_search'       => ['method' => 'GET',  'path' => '/rentals/search/'],
        'rental_cities'       => ['method' => 'GET',  'path' => '/rentals/cities/'],
        'rental_create'       => ['method' => 'POST', 'path' => '/rentals/'],
        'rental_by_ref'       => ['method' => 'GET',  'path' => '/rentals/by-ref/', 'dynamic' => true],
        'rental_insurance'    => ['method' => 'GET',  'path' => '/rentals/insurance/'],
        'rental_extras'       => ['method' => 'GET',  'path' => '/rentals/extras/'],
    ];

    public function handle_request() {
        // Verify nonce
        check_ajax_referer('tb_api_nonce', 'nonce');

        // Get and validate endpoint
        $endpoint_key = isset($_POST['endpoint']) ? sanitize_text_field(wp_unslash($_POST['endpoint'])) : '';

        if (!isset($this->allowed_endpoints[$endpoint_key])) {
            wp_send_json_error(['message' => 'Invalid endpoint.'], 400);
        }

        $endpoint = $this->allowed_endpoints[$endpoint_key];
        $base_url = rtrim(TB_Settings::get('tb_api_base_url'), '/');
        $url = $base_url . '/api/v1' . $endpoint['path'];

        // Handle dynamic path suffix (e.g. /transfers/by-ref/{ref}/, /trips/{slug}/)
        if (!empty($endpoint['dynamic'])) {
            $raw_params_check = isset($_POST['params']) ? wp_unslash($_POST['params']) : '{}';
            $params_check = json_decode($raw_params_check, true);
            if (is_array($params_check) && !empty($params_check['_path_suffix'])) {
                $path_suffix = sanitize_text_field($params_check['_path_suffix']);
                // Only allow safe characters in path suffix
                $path_suffix = preg_replace('/[^a-zA-Z0-9\-_\/.]/', '', $path_suffix);
                $url = rtrim($url, '/') . '/' . ltrim($path_suffix, '/');
                if (substr($url, -1) !== '/') {
                    $url .= '/';
                }
            }
        }

        // Parse parameters
        $raw_params = isset($_POST['params']) ? wp_unslash($_POST['params']) : '{}';
        $params = json_decode($raw_params, true);
        if (!is_array($params)) {
            $params = [];
        }
        $params = $this->sanitize_params($params);
        unset($params['_path_suffix']);

        // Build request
        $args = [
            'timeout' => 30,
            'headers' => [
                'Content-Type'    => 'application/json',
                'Accept'          => 'application/json',
                'Accept-Language' => $this->get_current_language(),
            ],
        ];

        // Add API key if configured
        $api_key = TB_Settings::get('tb_api_key');
        if ($api_key) {
            $args['headers']['X-API-Key'] = $api_key;
        }

        if ($endpoint['method'] === 'GET') {
            $url = add_query_arg($params, $url);
            $response = wp_remote_get($url, $args);
        } else {
            $args['body'] = wp_json_encode($params);
            $response = wp_remote_post($url, $args);
        }

        // Handle errors
        if (is_wp_error($response)) {
            self::log("WP error [{$endpoint_key}]: " . $response->get_error_message() . " | URL: {$url}");
            wp_send_json_error(['message' => $response->get_error_message()], 500);
        }

        $status_code = wp_remote_retrieve_response_code($response);
        $raw_body = wp_remote_retrieve_body($response);
        $body = json_decode($raw_body, true);

        if ($status_code >= 200 && $status_code < 300) {
            wp_send_json_success($body);
        } else {
            self::log("API error [{$endpoint_key}]: HTTP {$status_code} | URL: {$url} | Response: " . substr($raw_body, 0, 500));
            wp_send_json_error($body ?: ['message' => 'API request failed.'], $status_code);
        }
    }

    /**
     * Test API connection. Called via AJAX from admin settings page.
     */
    public function test_connection() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Unauthorized.'], 403);
        }
        check_ajax_referer('tb_api_nonce', 'nonce');

        $base_url = rtrim(TB_Settings::get('tb_api_base_url'), '/');
        $url = $base_url . '/api/v1/payments/gateways/';

        $args = [
            'timeout' => 15,
            'headers' => [
                'Accept' => 'application/json',
            ],
        ];

        $api_key = TB_Settings::get('tb_api_key');
        if ($api_key) {
            $args['headers']['X-API-Key'] = $api_key;
        }

        $response = wp_remote_get($url, $args);

        if (is_wp_error($response)) {
            wp_send_json_error(['message' => $response->get_error_message()]);
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code >= 200 && $status_code < 300) {
            wp_send_json_success(['message' => 'Connection successful! API is reachable.']);
        } else {
            wp_send_json_error(['message' => 'API returned status ' . $status_code . '.']);
        }
    }

    private function get_current_language() {
        // WPML
        if (defined('ICL_LANGUAGE_CODE')) {
            return ICL_LANGUAGE_CODE;
        }
        // Polylang
        if (function_exists('pll_current_language')) {
            return pll_current_language('slug');
        }
        // Fallback to WordPress locale (e.g. fr_FR → fr)
        $locale = determine_locale();
        return substr($locale, 0, 2);
    }

    /**
     * Log a message to the plugin debug log file.
     * Only writes if tb_enable_debug_log is enabled.
     */
    public static function log($message) {
        if (!TB_Settings::get('tb_enable_debug_log')) {
            return;
        }
        $log_file = TB_PLUGIN_DIR . 'debug.log';
        $timestamp = current_time('Y-m-d H:i:s');
        // Keep log file under 500KB
        if (file_exists($log_file) && filesize($log_file) > 512000) {
            $lines = file($log_file);
            file_put_contents($log_file, implode('', array_slice($lines, -200)));
        }
        file_put_contents($log_file, "[{$timestamp}] {$message}\n", FILE_APPEND | LOCK_EX);
    }

    private function sanitize_params($params) {
        $sanitized = [];

        foreach ($params as $key => $value) {
            $key = sanitize_text_field($key);

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitize_params($value);
            } elseif (is_numeric($value)) {
                $sanitized[$key] = is_float($value + 0) ? (float) $value : (int) $value;
            } elseif (is_bool($value)) {
                $sanitized[$key] = $value;
            } elseif (is_null($value)) {
                $sanitized[$key] = null;
            } elseif ($key === 'customer_email') {
                $sanitized[$key] = sanitize_email($value);
            } else {
                $sanitized[$key] = sanitize_text_field($value);
            }
        }

        return $sanitized;
    }
}
