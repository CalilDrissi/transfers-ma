<?php defined('ABSPATH') || exit; ?>

<!-- Mode tabs (left-aligned with icons, underline active) -->
<div class="tb-mode-tabs">
    <button type="button" class="tb-mode-tab tb-mode-tab--active" data-mode="one-way">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 5H11V3.5C11 2.12 9.88 1 8.5 1h-3C4.12 1 3 2.12 3 3.5V5H.5a.5.5 0 00-.5.5v2a.5.5 0 00.5.5H1v5.5a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0013 13V8h.5a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5zM4 3.5A1.5 1.5 0 015.5 2h3A1.5 1.5 0 0110 3.5V5H4V3.5z" fill="currentColor"/></svg>
        <?php esc_html_e('Transfers', 'transfers-booking'); ?>
    </button>
    <button type="button" class="tb-mode-tab" data-mode="round-trip">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5A5.5 5.5 0 1113.5 8 5.51 5.51 0 018 13.5zM8.5 4H7v5l4.25 2.55.75-1.23-3.5-2.07V4z" fill="currentColor"/></svg>
        <?php esc_html_e('Round trip', 'transfers-booking'); ?>
    </button>
    <button type="button" class="tb-mode-tab" data-mode="multi-city">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 118 4.5a1.75 1.75 0 010 3.5z" fill="currentColor"/></svg>
        <?php esc_html_e('Multi-city', 'transfers-booking'); ?>
    </button>
</div>

<!-- Hero headline -->
<h1 class="tb-step1-headline"><?php esc_html_e('Comfortable car transfers with professional drivers.', 'transfers-booking'); ?></h1>

<!-- Single trip pill bar (one-way & round-trip) -->
<div id="tb-single-bar">
    <div class="tb-pill-bar__row">
        <!-- From -->
        <div class="tb-pill-bar__field tb-pill-bar__field--from">
            <span class="tb-pill-bar__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>
            </span>
            <input type="text" class="tb-pill-bar__input" data-leg="0" data-field="pickup" placeholder="<?php esc_attr_e('From city, hotel, airport', 'transfers-booking'); ?>" autocomplete="off">
            <button type="button" class="tb-pill-bar__clear" aria-label="<?php esc_attr_e('Clear', 'transfers-booking'); ?>" style="display:none;">&times;</button>
            <div class="tb-autocomplete-dropdown" data-leg="0" data-dropdown="pickup"></div>
            <button type="button" class="tb-pill-bar__swap" id="tb-swap-btn" title="<?php esc_attr_e('Swap locations', 'transfers-booking'); ?>">&#8652;</button>
        </div>
        <!-- To -->
        <div class="tb-pill-bar__field tb-pill-bar__field--to">
            <span class="tb-pill-bar__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1C4.79 1 3 2.79 3 5c0 3 4 7.5 4 7.5s4-4.5 4-7.5c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 117 4a1.5 1.5 0 010 3z" fill="currentColor"/></svg>
            </span>
            <input type="text" class="tb-pill-bar__input" data-leg="0" data-field="dropoff" placeholder="<?php esc_attr_e('To city, hotel, airport', 'transfers-booking'); ?>" autocomplete="off">
            <button type="button" class="tb-pill-bar__clear" aria-label="<?php esc_attr_e('Clear', 'transfers-booking'); ?>" style="display:none;">&times;</button>
            <div class="tb-autocomplete-dropdown" data-leg="0" data-dropdown="dropoff"></div>
        </div>
        <!-- Date -->
        <div class="tb-pill-bar__field tb-pill-bar__field--date">
            <span class="tb-pill-bar__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 1v1.5M9.5 1v1.5M1.5 5.5h11M2.5 2.5h9a1 1 0 011 1v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </span>
            <input type="datetime-local" class="tb-pill-bar__input" data-leg="0" data-field="datetime">
        </div>
        <!-- Return date (hidden initially) -->
        <div class="tb-pill-bar__field tb-pill-bar__field--return" id="tb-return-field" style="display:none;">
            <span class="tb-pill-bar__icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 1v1.5M9.5 1v1.5M1.5 5.5h11M2.5 2.5h9a1 1 0 011 1v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </span>
            <input type="datetime-local" class="tb-pill-bar__input" id="tb-return-datetime" data-field="return-datetime">
            <button type="button" class="tb-pill-bar__clear tb-pill-bar__return-remove" id="tb-remove-return" title="<?php esc_attr_e('Remove return', 'transfers-booking'); ?>">&times;</button>
        </div>
        <!-- + Add return -->
        <button type="button" class="tb-pill-bar__add-return" id="tb-add-return">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <?php esc_html_e('Add return', 'transfers-booking'); ?>
        </button>
        <!-- Pax -->
        <div class="tb-pill-bar__pax">
            <div class="tb-pax-pill" id="tb-pax-pill">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 12c0-1.66 2.24-3 5-3s5 1.34 5 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                <span id="tb-pax-pill-text">1 pax, 1 bag</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
        </div>
        <!-- Search button -->
        <button type="button" id="tb-btn-search" class="tb-pill-bar__search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <?php esc_html_e('Search', 'transfers-booking'); ?>
        </button>
    </div>
</div>

<!-- Multi-city bar -->
<div id="tb-multi-bar" class="tb-multi-bar">
    <div id="tb-legs-container"></div>
    <label id="tb-return-to-start" class="tb-return-toggle" style="display:none;">
        <input type="checkbox" id="tb-return-to-start-check">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/></svg><?php esc_html_e('Return to start', 'transfers-booking'); ?>
    </label>
    <button type="button" id="tb-add-leg">+ <?php esc_html_e('Add another transfer', 'transfers-booking'); ?></button>
    <div class="tb-multi-bar__footer">
        <div class="tb-pill-bar__pax" style="position:relative;">
            <div class="tb-pax-pill" id="tb-pax-pill-multi">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 12c0-1.66 2.24-3 5-3s5 1.34 5 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                <span id="tb-pax-pill-text-multi">1 pax, 1 bag</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
        </div>
        <button type="button" id="tb-btn-search-multi" class="tb-pill-bar__search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <?php esc_html_e('Search', 'transfers-booking'); ?>
        </button>
    </div>
</div>

<!-- Flight number (shown below bar when airport detected) -->
<div id="tb-flight-bar">
    <label class="tb-pill-bar__label"><?php esc_html_e('Flight Number', 'transfers-booking'); ?></label>
    <input type="text" id="tb-flight-number" class="tb-pill-bar__input" placeholder="<?php esc_attr_e('e.g. AT 1234', 'transfers-booking'); ?>" autocomplete="off">
</div>

<!-- Error display -->
<div id="tb-no-route-container" style="display:none;"></div>

<!-- Trust badges -->
<div class="tb-trust-badges">
    <span class="tb-trust-badge tb-trust-badge--cancel">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1z" stroke="#10b981" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <?php esc_html_e('Cancel for free 24 hours before departure', 'transfers-booking'); ?>
    </span>
    <span class="tb-trust-badge tb-trust-badge--rating">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l2.12 4.3 4.74.69-3.43 3.34.81 4.72L8 11.77l-4.24 2.23.81-4.72L1.14 5.94l4.74-.69L8 1z" fill="#fbbf24"/></svg>
        <?php esc_html_e('4.9/5 Google Reviews', 'transfers-booking'); ?>
    </span>
    <span class="tb-trust-badge">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L3 3.5v3.5c0 3.15 2.14 6.1 5 7 2.86-.9 5-3.85 5-7V3.5L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        <?php esc_html_e('Secure payment', 'transfers-booking'); ?>
    </span>
</div>

<!-- Pax/luggage dropdown (shared by single & multi-city) -->
<div class="tb-pax-dropdown" id="tb-pax-dropdown">
    <div class="tb-pax-stepper">
        <span class="tb-pax-stepper__label"><?php esc_html_e('Passengers', 'transfers-booking'); ?></span>
        <div class="tb-pax-stepper__controls">
            <button type="button" class="tb-pax-stepper__btn" data-target="tb-pax-count" data-action="decrease">-</button>
            <span class="tb-pax-stepper__value" id="tb-pax-count">1</span>
            <button type="button" class="tb-pax-stepper__btn" data-target="tb-pax-count" data-action="increase">+</button>
        </div>
    </div>
    <div class="tb-pax-stepper">
        <span class="tb-pax-stepper__label"><?php esc_html_e('Luggage', 'transfers-booking'); ?></span>
        <div class="tb-pax-stepper__controls">
            <button type="button" class="tb-pax-stepper__btn" data-target="tb-luggage-count" data-action="decrease">-</button>
            <span class="tb-pax-stepper__value" id="tb-luggage-count">1</span>
            <button type="button" class="tb-pax-stepper__btn" data-target="tb-luggage-count" data-action="increase">+</button>
        </div>
    </div>
</div>
