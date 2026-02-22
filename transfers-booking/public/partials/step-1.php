<?php defined('ABSPATH') || exit; ?>

<!-- Mode tabs -->
<div class="tb-mode-tabs">
    <button type="button" class="tb-mode-tab tb-mode-tab--active" data-mode="one-way"><?php esc_html_e('One-way', 'transfers-booking'); ?></button>
    <button type="button" class="tb-mode-tab" data-mode="round-trip"><?php esc_html_e('Round trip', 'transfers-booking'); ?></button>
    <button type="button" class="tb-mode-tab" data-mode="multi-city"><?php esc_html_e('Multi-city', 'transfers-booking'); ?></button>
</div>

<!-- Single trip pill bar (one-way & round-trip) -->
<div id="tb-single-bar">
    <div class="tb-pill-bar__row">
        <div class="tb-pill-bar__field tb-pill-bar__field--from">
            <span class="tb-pill-bar__icon">&#9679;</span>
            <input type="text" class="tb-pill-bar__input" data-leg="0" data-field="pickup" placeholder="<?php esc_attr_e('From city, airport, or hotel...', 'transfers-booking'); ?>" autocomplete="off">
            <button type="button" class="tb-pill-bar__clear" aria-label="<?php esc_attr_e('Clear', 'transfers-booking'); ?>" style="display:none;">&times;</button>
            <div class="tb-autocomplete-dropdown" data-leg="0" data-dropdown="pickup"></div>
            <button type="button" class="tb-pill-bar__swap" id="tb-swap-btn" title="<?php esc_attr_e('Swap locations', 'transfers-booking'); ?>">&#8652;</button>
        </div>
        <div class="tb-pill-bar__field tb-pill-bar__field--to">
            <span class="tb-pill-bar__icon">&#9906;</span>
            <input type="text" class="tb-pill-bar__input" data-leg="0" data-field="dropoff" placeholder="<?php esc_attr_e('To city, hotel, or address...', 'transfers-booking'); ?>" autocomplete="off">
            <button type="button" class="tb-pill-bar__clear" aria-label="<?php esc_attr_e('Clear', 'transfers-booking'); ?>" style="display:none;">&times;</button>
            <div class="tb-autocomplete-dropdown" data-leg="0" data-dropdown="dropoff"></div>
        </div>
        <div class="tb-pill-bar__field tb-pill-bar__field--date">
            <span class="tb-pill-bar__icon">&#128197;</span>
            <input type="datetime-local" class="tb-pill-bar__input" data-leg="0" data-field="datetime">
        </div>
        <div class="tb-pill-bar__field tb-pill-bar__field--return" id="tb-return-field" style="display:none;">
            <span class="tb-pill-bar__icon">&#128197;</span>
            <input type="datetime-local" class="tb-pill-bar__input" id="tb-return-datetime" data-field="return-datetime">
            <button type="button" class="tb-pill-bar__clear tb-pill-bar__return-remove" id="tb-remove-return" title="<?php esc_attr_e('Remove return', 'transfers-booking'); ?>">&times;</button>
        </div>
        <button type="button" class="tb-pill-bar__add-return" id="tb-add-return">+ <?php esc_html_e('Return', 'transfers-booking'); ?></button>
        <div class="tb-pill-bar__pax">
            <div class="tb-pax-pill" id="tb-pax-pill">
                <span class="tb-pax-pill__icon">&#128100;</span>
                <span id="tb-pax-pill-text">1 pax, 1 bag</span>
                <span>&#9662;</span>
            </div>
        </div>
        <button type="button" id="tb-btn-search" class="tb-pill-bar__search"><?php esc_html_e('Search', 'transfers-booking'); ?></button>
    </div>
</div>

<!-- Multi-city bar -->
<div id="tb-multi-bar" class="tb-multi-bar">
    <div id="tb-legs-container"></div>
    <label id="tb-return-to-start" class="tb-return-toggle" style="display:none;">
        <input type="checkbox" id="tb-return-to-start-check">
        ↩ <?php esc_html_e('Return to start', 'transfers-booking'); ?>
    </label>
    <button type="button" id="tb-add-leg">+ <?php esc_html_e('Add another transfer', 'transfers-booking'); ?></button>
    <div class="tb-multi-bar__footer">
        <div class="tb-pill-bar__pax" style="position:relative;">
            <div class="tb-pax-pill" id="tb-pax-pill-multi">
                <span class="tb-pax-pill__icon">&#128100;</span>
                <span id="tb-pax-pill-text-multi">1 pax, 1 bag</span>
                <span>&#9662;</span>
            </div>
        </div>
        <button type="button" id="tb-btn-search-multi" class="tb-pill-bar__search"><?php esc_html_e('Search', 'transfers-booking'); ?></button>
    </div>
</div>

<!-- Flight number (shown below bar when airport detected) -->
<div id="tb-flight-bar">
    <label class="tb-pill-bar__label"><?php esc_html_e('Flight Number', 'transfers-booking'); ?></label>
    <input type="text" id="tb-flight-number" class="tb-pill-bar__input" placeholder="<?php esc_attr_e('e.g. AT 1234', 'transfers-booking'); ?>" autocomplete="off">
</div>

<!-- Error display -->
<div id="tb-no-route-container" style="display:none;"></div>

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
