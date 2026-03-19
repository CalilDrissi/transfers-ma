<?php
/**
 * Shortcode registration and rendering.
 * Usage: [transfers_booking]
 */

defined('ABSPATH') || exit;

class TB_Shortcode {

    public function render($atts) {
        $atts = shortcode_atts([
            'lang'             => '',
            'fixed_origin'     => '',
            'fixed_origin_lat' => '',
            'fixed_origin_lng' => '',
            'title'            => '',
        ], $atts, 'transfers_booking');

        $lang             = sanitize_text_field($atts['lang']);
        $fixed_origin     = sanitize_text_field($atts['fixed_origin']);
        $fixed_origin_lat = sanitize_text_field($atts['fixed_origin_lat']);
        $fixed_origin_lng = sanitize_text_field($atts['fixed_origin_lng']);
        $title            = sanitize_text_field($atts['title']);

        // Ensure CSS + JS are loaded (page builders like Elementor bypass wp_enqueue_scripts detection)
        if (!wp_style_is('tb-booking', 'enqueued')) {
            wp_enqueue_style('tb-booking', TB_PLUGIN_URL . 'public/css/tb-booking.css', [], TB_VERSION);
            $primary = esc_attr(TB_Settings::get('tb_primary_color'));
            $accent = esc_attr(TB_Settings::get('tb_accent_color'));
            $accent_hover = TB_Public::darken_hex_static($accent, 12);
            $primary_light = TB_Public::darken_hex_static($primary, -15);
            wp_add_inline_style('tb-booking', ".tb-booking-widget { --tb-primary: {$primary}; --tb-primary-light: {$primary_light}; --tb-accent: {$accent}; --tb-accent-hover: {$accent_hover}; }");
        }
        $gmaps_key = TB_Settings::get('tb_google_maps_api_key');
        if ($gmaps_key && !wp_script_is('google-maps', 'enqueued')) {
            wp_enqueue_script('google-maps', 'https://maps.googleapis.com/maps/api/js?key=' . urlencode($gmaps_key) . '&libraries=places&callback=Function.prototype', [], null, true);
        }
        $deps = $gmaps_key ? ['google-maps'] : [];
        foreach (['tb-utils', 'tb-api', 'tb-state', 'tb-wizard', 'tb-step1', 'tb-step2', 'tb-step3'] as $handle) {
            if (!wp_script_is($handle, 'enqueued')) {
                wp_enqueue_script($handle, TB_PLUGIN_URL . "public/js/{$handle}.js", $deps, TB_VERSION, true);
                $deps = [$handle];
            }
        }
        if (!did_action('tb_config_localized')) {
            wp_localize_script('tb-utils', 'tbConfig', TB_Public::get_js_config_static());
            do_action('tb_config_localized');
        }
        // Stripe for payment
        if (TB_Settings::get('tb_stripe_publishable_key') && !wp_script_is('stripe-js', 'enqueued')) {
            wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);
        }

        // Switch locale if lang override is set
        $switched_locale = false;
        if ($lang && $lang !== determine_locale()) {
            switch_to_locale($lang);
            $switched_locale = true;
        }

        ob_start();
        include TB_PLUGIN_DIR . 'public/partials/booking-widget.php';
        $output = ob_get_clean();

        if ($switched_locale) {
            restore_previous_locale();
        }

        // Append WP theme override styles INSIDE the body HTML (loads after all <head> CSS)
        $output .= self::get_wp_overrides();

        return $output;
    }

    /**
     * Nuclear CSS overrides injected in the body to beat any WP theme.
     * Uses html body prefix + !important on everything.
     */
    private static function get_wp_overrides() {
        return '<style id="tb-wp-overrides">
/* === Widget container: full width, break out of theme container === */
html body #tb-booking-widget {
    max-width: 100vw !important;
    width: 100vw !important;
    padding: 0 !important;
    margin-left: calc(-50vw + 50%) !important;
    margin-right: calc(-50vw + 50%) !important;
    overflow-x: hidden !important;
    background: transparent !important;
}

/* === Step 1: full-bleed hero === */
html body #tb-booking-widget #tb-step-1 {
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
}

/* === Ensure WP theme does not constrain step-1 children === */
html body #tb-booking-widget #tb-step-1 .tb-mode-tabs,
html body #tb-booking-widget #tb-step-1 .tb-step1-headline,
html body #tb-booking-widget #tb-step-1 #tb-single-bar,
html body #tb-booking-widget #tb-step-1 #tb-multi-bar,
html body #tb-booking-widget #tb-step-1 #tb-flight-bar,
html body #tb-booking-widget #tb-step-1 #tb-no-route-container,
html body #tb-booking-widget #tb-step-1 .tb-trust-badges {
    max-width: 1400px !important;
    width: 100% !important;
}

/* === Hide progress bar on Step 1 === */
html body #tb-booking-widget .tb-progress {
    display: none !important;
}

/* === WP Theme Reset: beat any theme selector === */
html body #tb-booking-widget *,
html body #tb-booking-widget *::before,
html body #tb-booking-widget *::after {
    box-sizing: border-box !important;
}
html body #tb-booking-widget button,
html body #tb-booking-widget input[type="button"],
html body #tb-booking-widget input[type="submit"],
html body #tb-booking-widget input[type="reset"] {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
    text-decoration: none !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    line-height: normal !important;
    outline: none !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    transition: all 0.2s !important;
}
html body #tb-booking-widget input,
html body #tb-booking-widget select,
html body #tb-booking-widget textarea {
    box-shadow: none !important;
    text-shadow: none !important;
    outline: none !important;
}
html body #tb-booking-widget input:focus,
html body #tb-booking-widget select:focus,
html body #tb-booking-widget textarea:focus {
    box-shadow: none !important;
}

/* Buttons */
html body #tb-booking-widget .tb-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.5rem !important;
    padding: 14px 28px !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    white-space: nowrap !important;
    text-decoration: none !important;
    box-shadow: none !important;
}
html body #tb-booking-widget .tb-btn--primary {
    background: var(--tb-accent, #e94560) !important;
    color: #fff !important;
}
html body #tb-booking-widget .tb-btn--primary:hover:not(:disabled) {
    background: var(--tb-accent-hover, #d63d56) !important;
    color: #fff !important;
}
html body #tb-booking-widget .tb-btn--primary:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
}
html body #tb-booking-widget .tb-btn-back {
    background: none !important;
    border: none !important;
    color: var(--tb-text-muted, #6c757d) !important;
    padding: 8px 0 !important;
    font-size: 0.9rem !important;
    cursor: pointer !important;
}

/* ═══ Step 1: Theme-proof overrides ═══ */
html body #tb-booking-widget #tb-step-1 {
    background: var(--tb-primary, #1a1a2e) !important;
    border-radius: 0 !important;
    padding: 0 !important;
    position: relative !important;
    overflow: hidden !important;
    border: none !important;
    box-shadow: none !important;
    min-height: 560px !important;
}
html body #tb-booking-widget #tb-step-1 > *:not(.tb-hero-curve):not(.tb-pax-dropdown):not(.tb-pax-backdrop) {
    position: relative !important;
    z-index: 1 !important;
    max-width: 1400px !important;
    width: 100% !important;
    padding-left: 80px !important;
    padding-right: 80px !important;
}

/* Hero decorative curve */
html body #tb-booking-widget .tb-hero-curve {
    position: absolute !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 35% !important;
    height: 100% !important;
    pointer-events: none !important;
    z-index: 0 !important;
    padding: 0 !important;
    max-width: none !important;
}

/* Mode Tabs */
html body #tb-booking-widget .tb-mode-tabs {
    display: flex !important;
    justify-content: flex-start !important;
    gap: 0 !important;
    margin-bottom: 0 !important;
    border-bottom: 1px solid rgba(255,255,255,0.08) !important;
    padding-top: 24px !important;
    padding-bottom: 0 !important;
    background: transparent !important;
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
}
html body #tb-booking-widget .tb-mode-tab {
    background: transparent !important;
    border: none !important;
    border-bottom: 2px solid transparent !important;
    border-radius: 0 !important;
    padding: 12px 16px !important;
    font-weight: 500 !important;
    font-size: 1rem !important;
    color: rgba(255,255,255,0.5) !important;
    cursor: pointer !important;
    outline: none !important;
    box-shadow: none !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    white-space: nowrap !important;
}
html body #tb-booking-widget .tb-mode-tab:hover {
    background: transparent !important;
    color: rgba(255,255,255,0.85) !important;
}
html body #tb-booking-widget .tb-mode-tab--active {
    background: transparent !important;
    color: #fff !important;
    border-bottom-color: var(--tb-accent, #e94560) !important;
}
html body #tb-booking-widget .tb-mode-tab--active:hover {
    background: transparent !important;
    color: #fff !important;
}

/* Hero headline */
html body #tb-booking-widget .tb-step1-headline {
    font-size: 3.5rem !important;
    font-weight: 500 !important;
    color: #fff !important;
    line-height: 1.1 !important;
    margin: 16px 0 32px !important;
    max-width: 700px !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
    letter-spacing: -0.02em !important;
}

/* Unified search bar row */
html body #tb-booking-widget .tb-pill-bar__row {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: stretch !important;
    gap: 0 !important;
    background: #fff !important;
    border-radius: 50px !important;
    padding: 4px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    border: none !important;
}

/* Fields */
html body #tb-booking-widget .tb-pill-bar__field {
    flex: 0 0 auto !important;
    min-width: 0 !important;
    position: relative !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 6px !important;
    padding: 12px !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    border-right: 1px solid #e5e7eb !important;
    box-shadow: none !important;
}
html body #tb-booking-widget .tb-pill-bar__field--from,
html body #tb-booking-widget .tb-pill-bar__field--to {
    flex: 1 1 0 !important;
    min-width: 0 !important;
}
html body #tb-booking-widget .tb-pill-bar__field--from {
    border-radius: 20px 0 0 20px !important;
}
html body #tb-booking-widget .tb-pill-bar__field--date,
html body #tb-booking-widget .tb-pill-bar__field--return {
    flex: 0 0 auto !important;
    width: 170px !important;
}
html body #tb-booking-widget .tb-pill-bar__field:last-of-type {
    border-right: none !important;
}

/* Field icons */
html body #tb-booking-widget .tb-pill-bar__icon {
    flex-shrink: 0 !important;
    font-size: 0.9rem !important;
    color: #6b7280 !important;
    line-height: 1 !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
}

/* Inputs inside bar */
html body #tb-booking-widget .tb-pill-bar__input {
    border: none !important;
    background: transparent !important;
    font-size: 0.95rem !important;
    color: #111827 !important;
    padding: 0 !important;
    width: 100% !important;
    outline: none !important;
    min-width: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    height: auto !important;
    line-height: normal !important;
    margin: 0 !important;
}
html body #tb-booking-widget .tb-pill-bar__input::placeholder {
    color: #9ca3af !important;
}
html body #tb-booking-widget .tb-pill-bar__input:focus {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
}

/* Autocomplete dropdown inside bar fields */
html body #tb-booking-widget .tb-pill-bar__field .tb-autocomplete-dropdown {
    position: absolute !important;
    top: calc(100% + 14px) !important;
    left: -6px !important;
    right: auto !important;
    z-index: 100 !important;
    min-width: 420px !important;
    width: max-content !important;
    max-width: 600px !important;
    border-radius: 12px !important;
    background: #fff !important;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12) !important;
    overflow-y: auto !important;
    max-height: 280px !important;
}
html body #tb-booking-widget .tb-pill-bar__field .tb-autocomplete-item__name {
    white-space: normal !important;
    word-break: break-word !important;
    overflow: visible !important;
    text-overflow: unset !important;
}
html body #tb-booking-widget .tb-autocomplete-item {
    padding: 14px 16px !important;
    display: flex !important;
    align-items: center !important;
    gap: 14px !important;
    font-size: 1rem !important;
    background: #fff !important;
    border: none !important;
    border-bottom: 1px solid #e0e0e0 !important;
    box-shadow: none !important;
}

/* Clear buttons */
html body #tb-booking-widget .tb-pill-bar__clear {
    flex-shrink: 0 !important;
    width: 22px !important;
    height: 22px !important;
    border-radius: 50% !important;
    background: #e5e7eb !important;
    border: none !important;
    cursor: pointer !important;
    font-size: 0.85rem !important;
    line-height: 1 !important;
    align-items: center !important;
    justify-content: center !important;
    color: #6b7280 !important;
    padding: 0 !important;
    box-shadow: none !important;
}

/* Swap button */
html body #tb-booking-widget .tb-pill-bar__swap {
    position: absolute !important;
    right: -14px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    background: #fff !important;
    border: 1px solid #e5e7eb !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    z-index: 10 !important;
    font-size: 0.75rem !important;
    color: #6b7280 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
    padding: 0 !important;
}

/* Add return button */
html body #tb-booking-widget .tb-pill-bar__add-return {
    border: none !important;
    border-right: 1px solid #e5e7eb !important;
    background: transparent !important;
    color: #6b7280 !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    padding: 8px 14px !important;
    white-space: nowrap !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    gap: 4px !important;
    box-shadow: none !important;
    border-radius: 0 !important;
}

/* Return field border */
html body #tb-booking-widget #tb-return-field {
    border-right: 1px solid #e5e7eb !important;
}

/* Pax container */
html body #tb-booking-widget .tb-pill-bar__pax {
    position: relative !important;
    align-items: center !important;
    padding: 0 8px !important;
    border-right: none !important;
    flex: 0 0 auto !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
}

/* Pax pill */
html body #tb-booking-widget .tb-pax-pill {
    align-items: center !important;
    gap: 8px !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 6px 10px !important;
    cursor: pointer !important;
    white-space: nowrap !important;
    font-size: 0.9rem !important;
    font-weight: 500 !important;
    color: #111827 !important;
    box-shadow: none !important;
}

/* Multi-city pax pill: white text on dark bg */
html body #tb-booking-widget .tb-multi-bar__footer .tb-pax-pill {
    color: #fff !important;
}
html body #tb-booking-widget .tb-multi-bar__footer .tb-pax-pill svg {
    color: rgba(255,255,255,0.7) !important;
}

/* Pax backdrop */
html body #tb-booking-widget .tb-pax-backdrop {
    display: none !important;
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.4) !important;
    z-index: 99998 !important;
}
html body #tb-booking-widget .tb-pax-backdrop.tb-show { display: block !important; }
/* Pax dropdown (centered popup) */
html body #tb-booking-widget .tb-pax-dropdown {
    position: fixed !important;
    top: 50% !important; left: 50% !important;
    transform: translate(-50%, -50%) !important;
    right: auto !important; bottom: auto !important;
    background: #fff !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
    padding: 24px 28px 20px !important;
    z-index: 99999 !important;
    min-width: 280px !important;
    max-width: 320px !important;
    width: 90% !important;
    border: none !important;
}

/* Trust badges */
html body #tb-booking-widget .tb-trust-badges {
    display: flex !important;
    align-items: center !important;
    gap: 40px !important;
    margin-top: 32px !important;
    padding-bottom: 48px !important;
    flex-wrap: wrap !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
}
html body #tb-booking-widget .tb-trust-badge {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    color: #fff !important;
    font-size: 0.95rem !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    background: none !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
}

/* Counters (+/-) */
html body #tb-booking-widget .tb-counter__btn {
    background: var(--tb-light-bg, #f8f9fa) !important;
    border: none !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    width: 44px !important;
    height: 44px !important;
    font-size: 1.25rem !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
html body #tb-booking-widget .tb-counter__btn:hover {
    background: var(--tb-border, #e0e0e0) !important;
}

/* Pill Bar buttons */
html body #tb-booking-widget .tb-pill-bar__btn {
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    padding: 8px 16px !important;
    font-weight: 500 !important;
    box-shadow: none !important;
}
html body #tb-booking-widget .tb-pill-bar__btn--accent,
html body #tb-booking-widget .tb-pill-bar__btn--search {
    background: var(--tb-accent) !important;
    color: #fff !important;
    border-radius: 50px !important;
}
html body #tb-booking-widget .tb-pill-bar__btn--accent:hover,
html body #tb-booking-widget .tb-pill-bar__btn--search:hover {
    background: #2563eb !important;
}
html body #tb-booking-widget .tb-pill-bar__btn--return {
    background: transparent !important;
    color: var(--tb-text-muted, #6c757d) !important;
    border: none !important;
}
html body #tb-booking-widget .tb-pill-bar__btn--swap {
    background: var(--tb-light-bg, #f8f9fa) !important;
    border: none !important;
    border-radius: 50% !important;
}

/* Inputs */
html body #tb-booking-widget .tb-input {
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    background: #fff !important;
    padding: 12px 14px !important;
    font-size: 1rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    width: 100% !important;
}
html body #tb-booking-widget .tb-input:focus {
    border-color: var(--tb-accent, #e94560) !important;
    outline: none !important;
}
html body #tb-booking-widget .tb-select {
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    background: #fff !important;
    padding: 12px 14px !important;
    font-size: 1rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
}

/* Extras toggles */
html body #tb-booking-widget .tb-extra-card__toggle {
    background: transparent !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    cursor: pointer !important;
}
html body #tb-booking-widget .tb-extra-card__toggle--checked {
    background: var(--tb-accent, #e94560) !important;
    border-color: var(--tb-accent, #e94560) !important;
    color: #fff !important;
}

/* Multi-city add/remove */
html body #tb-booking-widget .tb-multi-bar__add-btn {
    background: transparent !important;
    border: 2px dashed var(--tb-accent, #e94560) !important;
    color: var(--tb-accent, #e94560) !important;
    border-radius: 25px !important;
    cursor: pointer !important;
}
html body #tb-booking-widget .tb-leg-row__remove {
    background: transparent !important;
    border: none !important;
    color: var(--tb-text-muted, #6c757d) !important;
    cursor: pointer !important;
}

/* Multi-city leg row icons */
html body #tb-booking-widget .tb-leg-row__fields .tb-pill-bar__icon {
    font-size: 0 !important;
    width: 14px !important;
    height: 14px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
}
html body #tb-booking-widget .tb-leg-row__fields .tb-pill-bar__field--from .tb-pill-bar__icon::before {
    content: "" !important;
    display: block !important;
    width: 14px !important;
    height: 14px !important;
    background: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 14 14\' fill=\'none\'%3E%3Ccircle cx=\'7\' cy=\'7\' r=\'3\' stroke=\'%236b7280\' stroke-width=\'1.5\'/%3E%3Ccircle cx=\'7\' cy=\'7\' r=\'1\' fill=\'%236b7280\'/%3E%3C/svg%3E") no-repeat center !important;
    background-size: 14px 14px !important;
}
html body #tb-booking-widget .tb-leg-row__fields .tb-pill-bar__field--to .tb-pill-bar__icon::before {
    content: "" !important;
    display: block !important;
    width: 14px !important;
    height: 14px !important;
    background: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 14 14\' fill=\'none\'%3E%3Cpath d=\'M7 1C4.5 1 2.5 3 2.5 5.5C2.5 9 7 13 7 13s4.5-4 4.5-7.5C11.5 3 9.5 1 7 1z\' stroke=\'%236b7280\' stroke-width=\'1.3\'/%3E%3Ccircle cx=\'7\' cy=\'5.5\' r=\'1.5\' stroke=\'%236b7280\' stroke-width=\'1.3\'/%3E%3C/svg%3E") no-repeat center !important;
    background-size: 14px 14px !important;
}
html body #tb-booking-widget .tb-leg-row__fields .tb-pill-bar__field--date .tb-pill-bar__icon::before {
    content: "" !important;
    display: block !important;
    width: 14px !important;
    height: 14px !important;
    background: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 14 14\' fill=\'none\'%3E%3Cpath d=\'M4.5 1v1.5M9.5 1v1.5M1.5 5.5h11M2.5 2.5h9a1 1 0 011 1v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8a1 1 0 011-1z\' stroke=\'%236b7280\' stroke-width=\'1.3\' stroke-linecap=\'round\'/%3E%3C/svg%3E") no-repeat center !important;
    background-size: 14px 14px !important;
}

/* Vehicle cards */
html body #tb-booking-widget .tb-vehicle-card {
    cursor: pointer !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    background: #fff !important;
}
html body #tb-booking-widget .tb-vehicle-card.tb-selected,
html body #tb-booking-widget .tb-vehicle-card--selected {
    border-color: var(--tb-accent, #e94560) !important;
}

/* Search button */
html body #tb-booking-widget .tb-pill-bar__search {
    background: var(--tb-primary, #1a1a2e) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 50px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 14px 32px !important;
    margin: 3px !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
}
html body #tb-booking-widget .tb-pill-bar__search:hover {
    background: var(--tb-primary-light, #2d2d44) !important;
    color: #fff !important;
}

/* Pax stepper buttons */
html body #tb-booking-widget .tb-pax-stepper__btn {
    background: #fff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 50% !important;
    cursor: pointer !important;
    color: #374151 !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 1rem !important;
    padding: 0 !important;
    box-shadow: none !important;
}
html body #tb-booking-widget .tb-pax-stepper__btn:hover {
    border-color: var(--tb-accent) !important;
    color: var(--tb-accent) !important;
}

/* ═══ Checkout Progress Bar (Step 3) ═══ */
html body #tb-booking-widget .tb-checkout-progress {
    display: flex !important;
    align-items: center !important;
    gap: 0 !important;
    background: #fff !important;
    border-radius: 12px !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
    overflow: hidden !important;
    margin-bottom: 2rem !important;
    padding: 0 !important;
}
html body #tb-booking-widget .tb-checkout-progress__step {
    flex: 1 !important;
    text-align: center !important;
    padding: 1rem 0.75rem !important;
    font-size: 0.9rem !important;
    font-weight: 600 !important;
    color: var(--tb-text-muted, #6c757d) !important;
    background: transparent !important;
    border: none !important;
    margin: 0 !important;
}
html body #tb-booking-widget .tb-checkout-progress__step--done {
    color: var(--tb-success, #10b981) !important;
    background: rgba(16, 185, 129, 0.05) !important;
}
html body #tb-booking-widget .tb-checkout-progress__step--active {
    color: var(--tb-accent, #e94560) !important;
    background: rgba(233, 69, 96, 0.05) !important;
}
html body #tb-booking-widget .tb-checkout-progress__step--upcoming {
    opacity: 0.5 !important;
}

/* ═══ Step 3 Cards & Layout ═══ */
html body #tb-booking-widget .tb-card {
    background: #fff !important;
    border-radius: 12px !important;
    padding: 2rem !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
    border: none !important;
    margin-bottom: 1.5rem !important;
    overflow: visible !important;
}
html body #tb-booking-widget .tb-card__title {
    font-size: 1.25rem !important;
    font-weight: 700 !important;
    margin: 0 0 1.5rem !important;
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
}

/* Checkout location dots */
html body #tb-booking-widget .tb-checkout-location {
    display: flex !important;
    align-items: center !important;
    gap: 0.75rem !important;
    margin-bottom: 1rem !important;
}
html body #tb-booking-widget .tb-checkout-location__dot {
    width: 12px !important;
    height: 12px !important;
    border-radius: 50% !important;
    flex-shrink: 0 !important;
}
html body #tb-booking-widget .tb-checkout-location__dot--pickup {
    background: var(--tb-accent, #e94560) !important;
}
html body #tb-booking-widget .tb-checkout-location__dot--dropoff {
    background: var(--tb-primary, #1a1a2e) !important;
}
html body #tb-booking-widget .tb-checkout-row {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 1rem !important;
}

/* Phone input */
html body #tb-booking-widget .tb-phone-input {
    display: flex !important;
    align-items: stretch !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    overflow: visible !important;
    background: #fff !important;
    position: relative !important;
}
html body #tb-booking-widget .tb-phone-input__prefix {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    padding: 0 10px !important;
    background: var(--tb-bg, #f0f4f8) !important;
    font-weight: 600 !important;
    font-size: 0.9rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    border-right: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 0 !important;
    border-top: none !important;
    border-bottom: none !important;
    border-left: none !important;
    cursor: pointer !important;
}
html body #tb-booking-widget .tb-phone-input__field {
    flex: 1 !important;
    border: none !important;
    padding: 12px 14px !important;
    font-size: 1rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    background: #fff !important;
    outline: none !important;
    min-width: 0 !important;
}
html body .tb-phone-backdrop {
    display: none !important;
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.4) !important;
    z-index: 99998 !important;
}
html body .tb-phone-backdrop.tb-show { display: block !important; }
html body .tb-phone-dropdown {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    z-index: 99999 !important;
    background: #fff !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
    padding: 0 !important;
    min-width: 280px !important;
    max-width: 360px !important;
    width: 90% !important;
    max-height: 70vh !important;
    display: none !important;
    flex-direction: column !important;
    overflow: hidden !important;
    touch-action: manipulation !important;
    margin: 0 !important;
    border: none !important;
}
html body .tb-phone-dropdown.tb-show { display: flex !important; }
html body .tb-phone-dropdown__header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 16px 20px 12px !important;
    border-bottom: 1px solid var(--tb-border, #e0e0e0) !important;
}
html body .tb-phone-dropdown__close {
    background: none !important;
    border: none !important;
    font-size: 1.5rem !important;
    cursor: pointer !important;
    padding: 0 4px !important;
}
html body .tb-phone-dropdown__search {
    width: 100% !important;
    padding: 10px 20px !important;
    border: none !important;
    border-bottom: 1px solid var(--tb-border, #e0e0e0) !important;
    font-size: 16px !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    outline: none !important;
    background: #fafafa !important;
    border-radius: 0 !important;
}
html body .tb-phone-dropdown__list {
    overflow-y: auto !important;
    min-height: 120px !important;
    max-height: calc(70vh - 110px) !important;
    -webkit-overflow-scrolling: touch !important;
}
html body .tb-phone-dropdown__item {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    padding: 10px 20px !important;
    cursor: pointer !important;
    font-size: 0.9rem !important;
    border: none !important;
    background: transparent !important;
    touch-action: manipulation !important;
}
html body .tb-phone-dropdown__item:hover {
    background: var(--tb-bg, #f0f4f8) !important;
}
html body .tb-phone-dropdown__item-flag {
    width: 24px !important;
    height: 18px !important;
    object-fit: contain !important;
}
html body .tb-phone-input__flag {
    width: 20px !important;
    height: 15px !important;
    object-fit: contain !important;
}

/* Gateway selector */
html body #tb-booking-widget .tb-gateway-selector {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.5rem !important;
    margin-bottom: 1.25rem !important;
}
html body #tb-booking-widget .tb-gateway-option {
    display: flex !important;
    align-items: center !important;
    gap: 0.75rem !important;
    padding: 0.875rem 1rem !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    background: #fff !important;
}
html body #tb-booking-widget .tb-gateway-option--active {
    border-color: var(--tb-accent, #e94560) !important;
    background: rgba(233, 69, 96, 0.03) !important;
}

/* Custom fields (Additional Information) */
html body #tb-booking-widget .tb-tour-checkout__field {
    margin-bottom: 1.25rem !important;
}
html body #tb-booking-widget .tb-tour-checkout__label {
    display: block !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
    color: #475569 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.03em !important;
    margin-bottom: 6px !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
}
html body #tb-booking-widget .tb-tour-checkout__input,
html body #tb-booking-widget .tb-tour-checkout__textarea {
    width: 100% !important;
    padding: 12px 14px !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    font-size: 1rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    background: #fff !important;
    box-sizing: border-box !important;
}
html body #tb-booking-widget .tb-tour-checkout__input:focus,
html body #tb-booking-widget .tb-tour-checkout__textarea:focus {
    border-color: var(--tb-accent, #e94560) !important;
}
html body #tb-booking-widget #tb-custom-fields-container {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 0 1.5rem !important;
}

/* Confirm payment button — hidden until Stripe element is shown */
html body #tb-booking-widget #tb-confirm-payment-btn {
    margin-top: 0.75rem !important;
}
/* Stripe element — hidden by default */
html body #tb-booking-widget #tb-stripe-element {
    margin-top: 1rem !important;
    margin-bottom: 0.5rem !important;
}
/* Gradient summary sidebar */
html body #tb-booking-widget .tb-summary-gradient {
    background: linear-gradient(135deg, var(--tb-primary, #0f3460) 0%, #1a365d 100%) !important;
    border-radius: 12px !important;
    padding: 1.75rem !important;
    color: #fff !important;
    border: none !important;
}
html body #tb-booking-widget .tb-summary-gradient__header {
    display: flex !important;
    align-items: center !important;
    gap: 1rem !important;
    border-bottom: 1px solid rgba(255,255,255,0.15) !important;
    padding-bottom: 1.25rem !important;
    margin-bottom: 1.5rem !important;
}
html body #tb-booking-widget .tb-summary-gradient__vehicle-name {
    font-size: 1.1rem !important;
    font-weight: 700 !important;
    color: #fff !important;
}
html body #tb-booking-widget .tb-summary-gradient__vehicle-cap {
    font-size: 0.85rem !important;
    color: rgba(255,255,255,0.7) !important;
}
html body #tb-booking-widget .tb-summary-gradient__stop {
    display: flex !important;
    align-items: center !important;
    gap: 0.75rem !important;
    padding: 0.6rem 0 !important;
}
html body #tb-booking-widget .tb-summary-gradient__dot {
    width: 12px !important;
    height: 12px !important;
    border-radius: 50% !important;
    background: rgba(255,255,255,0.3) !important;
    border: 2px solid #fff !important;
    flex-shrink: 0 !important;
}
html body #tb-booking-widget .tb-summary-gradient__stop-text {
    color: #fff !important;
    font-size: 0.9rem !important;
    font-weight: 500 !important;
}
html body #tb-booking-widget .tb-summary-gradient__stop-price {
    color: #fff !important;
    font-weight: 700 !important;
}
html body #tb-booking-widget .tb-summary-gradient__total {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    border-top: 2px solid rgba(255,255,255,0.25) !important;
    margin-top: 1.25rem !important;
    padding-top: 1.25rem !important;
    font-size: 1.25rem !important;
    font-weight: 800 !important;
    color: #fff !important;
}

/* Payment options */
html body #tb-booking-widget .tb-payment-options {
    gap: 0.75rem !important;
    margin-bottom: 1.25rem !important;
}
html body #tb-booking-widget .tb-payment-option {
    display: flex !important;
    align-items: center !important;
    gap: 1rem !important;
    padding: 1rem 1.25rem !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    background: #fff !important;
}
html body #tb-booking-widget .tb-payment-option--active {
    border-color: var(--tb-accent, #e94560) !important;
    background: rgba(233, 69, 96, 0.03) !important;
}

/* Google Places autocomplete */
html body .pac-container {
    z-index: 100000 !important;
    min-width: 420px !important;
    width: auto !important;
    max-width: 600px !important;
    border-radius: 16px !important;
    border: none !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18) !important;
    padding: 8px 0 !important;
}
html body .pac-container::after {
    display: none !important;
}
html body .pac-item {
    padding: 10px 16px !important;
    cursor: pointer !important;
    border-bottom: none !important;
    border-top: none !important;
    display: flex !important;
    align-items: flex-start !important;
    gap: 10px !important;
    line-height: 1.4 !important;
    font-size: 0.9rem !important;
}
html body .pac-item .pac-item-query {
    font-size: 0.9rem !important;
    font-weight: 600 !important;
    color: #1f2937 !important;
    white-space: normal !important;
    word-break: break-word !important;
}
html body .pac-item .pac-item-query + span {
    font-size: 0.82rem !important;
    color: #6b7280 !important;
    white-space: normal !important;
}

/* ═══ Step 2: Route Bar & Vehicle Cards ═══ */
html body #tb-booking-widget .tb-route-bar {
    display: flex !important;
    align-items: center !important;
    gap: 1rem !important;
    background: #fff !important;
    border-radius: 12px !important;
    padding: 1rem 1.25rem !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
    border: none !important;
    margin-bottom: 0.75rem !important;
    flex-wrap: wrap !important;
}
html body #tb-booking-widget .tb-route-bar__point {
    display: flex !important;
    align-items: center !important;
    gap: 0.6rem !important;
    flex: 1 !important;
    min-width: 0 !important;
}
html body #tb-booking-widget .tb-route-bar__label {
    display: block !important;
    font-size: 0.72rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    color: var(--tb-text-muted, #6c757d) !important;
    font-weight: 600 !important;
}
html body #tb-booking-widget .tb-route-bar__address {
    display: block !important;
    font-size: 0.92rem !important;
    font-weight: 600 !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-width: 260px !important;
}
html body #tb-booking-widget .tb-trust-strip {
    display: flex !important;
    gap: 1.5rem !important;
    justify-content: flex-end !important;
    padding: 0.75rem 0 !important;
    background: transparent !important;
    border: none !important;
}
html body #tb-booking-widget .tb-trust-strip__badge {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    font-size: 0.82rem !important;
    color: var(--tb-text-muted, #6c757d) !important;
    font-weight: 500 !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
}
html body #tb-booking-widget .tb-route-map {
    width: 100% !important;
    height: 250px !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    margin-bottom: 1.5rem !important;
}
html body #tb-booking-widget .tb-checkout-map {
    width: 100% !important;
    height: 180px !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    margin-bottom: 1rem !important;
}
html body #tb-booking-widget .tb-vehicle-card {
    display: flex !important;
    flex-direction: row !important;
    align-items: stretch !important;
    cursor: pointer !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    background: #fff !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    padding: 0 !important;
}
html body #tb-booking-widget .tb-vehicle-card:hover {
    border-color: var(--tb-accent, #e94560) !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
}
html body #tb-booking-widget .tb-vehicle-card.tb-selected,
html body #tb-booking-widget .tb-vehicle-card--selected {
    border-color: var(--tb-accent, #e94560) !important;
}
html body #tb-booking-widget .tb-vehicle-card__image {
    width: 220px !important;
    min-height: 160px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
    background: var(--tb-light-bg, #f8f9fa) !important;
    padding: 1rem !important;
}
html body #tb-booking-widget .tb-vehicle-card__image img {
    max-width: 100% !important;
    height: auto !important;
    object-fit: contain !important;
}
html body #tb-booking-widget .tb-vehicle-card__details {
    flex: 1 !important;
    padding: 1.25rem !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    min-width: 0 !important;
}
html body #tb-booking-widget .tb-vehicle-card__name {
    font-size: 1.15rem !important;
    font-weight: 700 !important;
    margin: 0 0 0.5rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
}
html body #tb-booking-widget .tb-vehicle-card__specs {
    display: flex !important;
    gap: 1rem !important;
    font-size: 0.85rem !important;
    color: var(--tb-text-muted, #6c757d) !important;
}
html body #tb-booking-widget .tb-vehicle-card__pricing {
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-end !important;
    justify-content: center !important;
    padding: 1.25rem !important;
    min-width: 130px !important;
    gap: 0.5rem !important;
    border-left: 1px solid var(--tb-border, #e0e0e0) !important;
}
html body #tb-booking-widget .tb-vehicle-card__price-amount {
    font-size: 1.5rem !important;
    font-weight: 800 !important;
    color: var(--tb-accent, #e94560) !important;
}
html body #tb-booking-widget .tb-vehicle-card__select-btn {
    background: var(--tb-accent, #e94560) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 20px !important;
    padding: 8px 22px !important;
    font-size: 0.88rem !important;
    font-weight: 600 !important;
    cursor: pointer !important;
}
html body #tb-booking-widget .tb-vehicle-card__select-btn:hover {
    background: var(--tb-accent-hover, #d63d56) !important;
    color: #fff !important;
}

/* ═══ How It Works ═══ */
html body #tb-booking-widget .tb-how-it-works {
    margin-top: 3rem !important;
    padding-top: 2rem !important;
    border-top: 1px solid var(--tb-border, #e0e0e0) !important;
}
html body #tb-booking-widget .tb-how-it-works__steps {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 2rem !important;
}
html body #tb-booking-widget .tb-how-it-works__number {
    width: 48px !important;
    height: 48px !important;
    border-radius: 50% !important;
    background: var(--tb-accent, #e94560) !important;
    color: #fff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 1.25rem !important;
    font-weight: 700 !important;
    margin: 0 auto 1rem !important;
}

/* ═══ Payment Choice Cards ═══ */
html body #tb-booking-widget .tb-payment-choices {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.75rem !important;
    margin-bottom: 1.5rem !important;
}
html body #tb-booking-widget .tb-payment-choice {
    display: flex !important;
    align-items: flex-start !important;
    gap: 1rem !important;
    padding: 1rem 1.25rem !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    background: #fff !important;
}
html body #tb-booking-widget .tb-payment-choice:hover {
    border-color: var(--tb-accent, #e94560) !important;
}
html body #tb-booking-widget .tb-payment-choice--active {
    border-color: var(--tb-accent, #e94560) !important;
    background: rgba(233, 69, 96, 0.03) !important;
}
html body #tb-booking-widget .tb-payment-choice__radio {
    width: 20px !important;
    height: 20px !important;
    border-radius: 50% !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    flex-shrink: 0 !important;
    margin-top: 2px !important;
    position: relative !important;
}
html body #tb-booking-widget .tb-payment-choice--active .tb-payment-choice__radio {
    border-color: var(--tb-accent, #e94560) !important;
}

/* ═══ Terms & Promo ═══ */
html body #tb-booking-widget .tb-terms__label {
    display: flex !important;
    align-items: flex-start !important;
    gap: 0.75rem !important;
    cursor: pointer !important;
    font-size: 0.88rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
}
html body #tb-booking-widget .tb-terms__label a {
    color: var(--tb-accent, #e94560) !important;
    text-decoration: underline !important;
}
html body #tb-booking-widget .tb-promo-row {
    display: flex !important;
    gap: 0.5rem !important;
}
html body #tb-booking-widget .tb-promo-row__input {
    flex: 1 !important;
}

/* ═══ Confirmation ═══ */
html body #tb-booking-widget .tb-confirmation__checkmark {
    color: var(--tb-success, #10b981) !important;
}
html body #tb-booking-widget .tb-confirmation__actions {
    display: flex !important;
    gap: 1rem !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
}
html body #tb-booking-widget .tb-confirmation__actions .tb-btn--outline {
    background: transparent !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
}
html body #tb-booking-widget .tb-confirmation__actions .tb-btn--outline:hover {
    border-color: var(--tb-accent, #e94560) !important;
    color: var(--tb-accent, #e94560) !important;
}

/* ═══ Summary Gradient: Return Leg ═══ */
html body #tb-booking-widget .tb-summary-gradient__divider {
    height: 1px !important;
    background: rgba(255,255,255,0.15) !important;
    margin: 0.75rem 0 !important;
}

/* ═══ Step 1: Mobile overrides ═══ */
@media (max-width: 768px) {
    html body #tb-booking-widget #tb-step-1 {
        padding: 28px 20px 24px !important;
        border-radius: 0 !important;
        min-height: 400px !important;
    }
    html body #tb-booking-widget #tb-step-1::after {
        display: none !important;
    }
    html body #tb-booking-widget .tb-hero-curve {
        display: none !important;
    }
    html body #tb-booking-widget #tb-step-1 > *:not(.tb-hero-curve):not(.tb-pax-dropdown):not(.tb-pax-backdrop) {
        padding-left: 0 !important;
        padding-right: 0 !important;
    }
    html body #tb-booking-widget .tb-step1-headline {
        font-size: 1.6rem !important;
        margin: 1rem 0 1.5rem !important;
    }
    html body #tb-booking-widget .tb-pill-bar__row {
        flex-direction: column !important;
        border-radius: 16px !important;
        padding: 8px !important;
        gap: 0 !important;
        flex-wrap: wrap !important;
    }
    html body #tb-booking-widget .tb-pill-bar__field,
    html body #tb-booking-widget .tb-pill-bar__field--from,
    html body #tb-booking-widget .tb-pill-bar__field--to,
    html body #tb-booking-widget .tb-pill-bar__field--date,
    html body #tb-booking-widget .tb-pill-bar__field--return {
        width: 100% !important;
        flex: 0 0 auto !important;
        border-right: none !important;
        border-bottom: 1px solid #f1f5f9 !important;
        border-radius: 0 !important;
        padding: 14px !important;
    }
    html body #tb-booking-widget .tb-pill-bar__field:last-of-type {
        border-bottom: none !important;
    }
    html body #tb-booking-widget .tb-pill-bar__field--from {
        border-radius: 12px 12px 0 0 !important;
    }
    html body #tb-booking-widget .tb-pill-bar__swap {
        position: static !important;
        transform: none !important;
        width: 100% !important;
        height: 32px !important;
        border-radius: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        background: #f9fafb !important;
        border: none !important;
        border-bottom: 1px solid #f1f5f9 !important;
        font-size: 0.85rem !important;
        right: auto !important;
        top: auto !important;
    }
    html body #tb-booking-widget .tb-pill-bar__search {
        width: 100% !important;
        border-radius: 12px !important;
        padding: 14px !important;
        justify-content: center !important;
        margin: 4px 0 0 !important;
    }
    html body #tb-booking-widget .tb-pill-bar__pax {
        width: 100% !important;
        padding: 0 !important;
        border-bottom: 1px solid #f1f5f9 !important;
    }
    html body #tb-booking-widget .tb-pax-pill {
        width: 100% !important;
        justify-content: center !important;
        padding: 14px !important;
    }
    html body #tb-booking-widget .tb-pill-bar__add-return {
        width: 100% !important;
        justify-content: center !important;
        padding: 14px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        border-right: none !important;
    }
    html body #tb-booking-widget #tb-return-field {
        width: 100% !important;
        border-right: none !important;
        border-bottom: 1px solid #f1f5f9 !important;
    }
    html body #tb-booking-widget .tb-trust-badges {
        gap: 12px !important;
    }
    html body #tb-booking-widget .tb-trust-badge {
        font-size: 0.78rem !important;
    }
    html body #tb-booking-widget .tb-mode-tabs {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
    }
    html body #tb-booking-widget .tb-mode-tab {
        padding: 8px 14px !important;
        font-size: 0.82rem !important;
    }
    /* Step 2: mobile vehicle cards */
    html body #tb-booking-widget .tb-vehicle-card {
        flex-direction: column !important;
    }
    html body #tb-booking-widget .tb-vehicle-card__image {
        width: 100% !important;
        min-height: 140px !important;
        max-height: 180px !important;
    }
    html body #tb-booking-widget .tb-vehicle-card__pricing {
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        border-left: none !important;
        border-top: 1px solid var(--tb-border, #e0e0e0) !important;
        padding: 1rem 1.25rem !important;
        width: 100% !important;
        min-width: unset !important;
    }
    /* Step 2: route bar mobile */
    html body #tb-booking-widget .tb-route-bar {
        flex-direction: column !important;
        gap: 0 !important;
        padding: 0 !important;
    }
    html body #tb-booking-widget .tb-route-bar__point {
        padding: 12px 16px !important;
        border-bottom: 1px solid var(--tb-border, #e0e0e0) !important;
        width: 100% !important;
    }
    html body #tb-booking-widget .tb-route-bar__swap-icon {
        display: none !important;
    }
    html body #tb-booking-widget .tb-route-bar__address {
        max-width: 100% !important;
    }
    html body #tb-booking-widget .tb-route-map {
        height: 180px !important;
    }
    /* Step 2: trust strip mobile */
    html body #tb-booking-widget .tb-trust-strip {
        flex-wrap: wrap !important;
        gap: 8px 16px !important;
        justify-content: center !important;
    }
    /* Step 2: how-it-works mobile */
    html body #tb-booking-widget .tb-how-it-works__steps {
        grid-template-columns: 1fr !important;
        gap: 1.5rem !important;
    }
    html body #tb-booking-widget .tb-how-it-works__step {
        display: flex !important;
        align-items: flex-start !important;
        text-align: left !important;
        gap: 1rem !important;
    }
    html body #tb-booking-widget .tb-how-it-works__number {
        margin: 0 !important;
        flex-shrink: 0 !important;
        width: 40px !important;
        height: 40px !important;
        font-size: 1rem !important;
    }
    /* Step 3: single column */
    html body #tb-booking-widget .tb-step3-layout {
        grid-template-columns: 1fr !important;
    }
    html body #tb-booking-widget .tb-step3-sidebar {
        position: static !important;
        order: -1 !important;
    }
    html body #tb-booking-widget .tb-checkout-map {
        height: 140px !important;
    }
    /* Confirmation mobile */
    html body #tb-booking-widget .tb-confirmation__actions {
        flex-direction: column !important;
        gap: 10px !important;
    }
    html body #tb-booking-widget .tb-confirmation__actions .tb-btn {
        width: 100% !important;
        justify-content: center !important;
    }
}
</style>';
    }
}
