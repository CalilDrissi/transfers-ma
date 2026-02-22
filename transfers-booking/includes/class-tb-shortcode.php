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
        ], $atts, 'transfers_booking');

        $lang             = sanitize_text_field($atts['lang']);
        $fixed_origin     = sanitize_text_field($atts['fixed_origin']);
        $fixed_origin_lat = sanitize_text_field($atts['fixed_origin_lat']);
        $fixed_origin_lng = sanitize_text_field($atts['fixed_origin_lng']);

        // Ensure CSS + JS are loaded (page builders like Elementor bypass wp_enqueue_scripts detection)
        if (!wp_style_is('tb-booking', 'enqueued')) {
            wp_enqueue_style('tb-booking', TB_PLUGIN_URL . 'public/css/tb-booking.css', [], TB_VERSION);
            $primary = esc_attr(TB_Settings::get('tb_primary_color'));
            $accent = esc_attr(TB_Settings::get('tb_accent_color'));
            wp_add_inline_style('tb-booking', ":root { --tb-primary: {$primary}; --tb-accent: {$accent}; }");
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
/* === Widget container: full width === */
html body #tb-booking-widget {
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
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
    background: #0f172a !important;
    border-radius: 20px !important;
    padding: 40px 24px 28px !important;
    position: relative !important;
    overflow: hidden !important;
    border: none !important;
    box-shadow: none !important;
}
html body #tb-booking-widget #tb-step-1::after {
    content: "" !important;
    position: absolute !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 35% !important;
    background: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 500\'%3E%3Cpath d=\'M100 0 Q200 100 150 200 Q100 300 200 400 Q300 500 350 500\' fill=\'none\' stroke=\'%233b82f6\' stroke-width=\'40\' opacity=\'0.15\'/%3E%3Cpath d=\'M120 0 Q220 100 170 200 Q120 300 220 400 Q320 500 370 500\' fill=\'none\' stroke=\'%233b82f6\' stroke-width=\'6\' opacity=\'0.3\' stroke-dasharray=\'12 8\'/%3E%3C/svg%3E") no-repeat right center !important;
    background-size: contain !important;
    pointer-events: none !important;
    z-index: 0 !important;
}
html body #tb-booking-widget #tb-step-1 > * {
    position: relative !important;
    z-index: 1 !important;
}

/* Mode Tabs */
html body #tb-booking-widget .tb-mode-tabs {
    display: flex !important;
    justify-content: flex-start !important;
    gap: 0 !important;
    margin-bottom: 1.25rem !important;
    border-bottom: 1px solid rgba(255,255,255,0.1) !important;
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
    padding: 10px 20px 12px !important;
    font-weight: 600 !important;
    font-size: 0.9rem !important;
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
    color: #3b82f6 !important;
    border-bottom-color: #3b82f6 !important;
}
html body #tb-booking-widget .tb-mode-tab--active:hover {
    background: transparent !important;
    color: #3b82f6 !important;
}

/* Hero headline */
html body #tb-booking-widget .tb-step1-headline {
    font-size: 2.5rem !important;
    font-weight: 700 !important;
    color: #fff !important;
    line-height: 1.15 !important;
    margin: 1.25rem 0 2rem !important;
    max-width: 600px !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
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

/* Pax dropdown */
html body #tb-booking-widget .tb-pax-dropdown {
    position: absolute !important;
    top: calc(100% + 10px) !important;
    right: 0 !important;
    background: #fff !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
    padding: 16px !important;
    z-index: 200 !important;
    min-width: 220px !important;
    border: none !important;
}

/* Trust badges */
html body #tb-booking-widget .tb-trust-badges {
    display: flex !important;
    align-items: center !important;
    gap: 24px !important;
    margin-top: 20px !important;
    flex-wrap: wrap !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
}
html body #tb-booking-widget .tb-trust-badge {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    color: rgba(255,255,255,0.75) !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
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
    background: #3b82f6 !important;
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

/* Search button (blue) — covered by #tb-booking-widget rules above */
html body #tb-booking-widget .tb-pill-bar__search {
    background: #3b82f6 !important;
    color: #fff !important;
    border: none !important;
    border-radius: 50px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 12px 24px !important;
    margin: 2px !important;
    font-size: 0.95rem !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
}
html body #tb-booking-widget .tb-pill-bar__search:hover {
    background: #2563eb !important;
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
    border-color: #3b82f6 !important;
    color: #3b82f6 !important;
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
    background: var(--tb-primary, #0f3460) !important;
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
html body #tb-booking-widget .tb-phone-dropdown {
    position: absolute !important;
    top: 100% !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 100 !important;
    background: #fff !important;
    border: 2px solid var(--tb-border, #e0e0e0) !important;
    border-radius: 8px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
    margin-top: 4px !important;
    max-height: 280px !important;
}
html body #tb-booking-widget .tb-phone-dropdown__search {
    width: 100% !important;
    padding: 10px 12px !important;
    border: none !important;
    border-bottom: 1px solid var(--tb-border, #e0e0e0) !important;
    font-size: 0.9rem !important;
    color: var(--tb-text-dark, #1a1a2e) !important;
    outline: none !important;
    background: #fafafa !important;
    border-radius: 8px 8px 0 0 !important;
}
html body #tb-booking-widget .tb-phone-dropdown__item {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    padding: 10px 12px !important;
    cursor: pointer !important;
    font-size: 0.9rem !important;
    border: none !important;
    background: transparent !important;
}
html body #tb-booking-widget .tb-phone-dropdown__item:hover {
    background: var(--tb-bg, #f0f4f8) !important;
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

/* ═══ Step 1: Mobile overrides ═══ */
@media (max-width: 768px) {
    html body #tb-booking-widget #tb-step-1 {
        padding: 28px 20px 24px !important;
        border-radius: 16px !important;
    }
    html body #tb-booking-widget #tb-step-1::after {
        display: none !important;
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
    html body #tb-booking-widget .tb-pax-dropdown {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        border-radius: 16px 16px 0 0 !important;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.15) !important;
        min-width: unset !important;
        padding: 20px !important;
        z-index: 1000 !important;
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
}
</style>';
    }
}
