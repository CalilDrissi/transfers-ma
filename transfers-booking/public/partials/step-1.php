<?php defined('ABSPATH') || exit; ?>

<div class="tb-card">
    <h3 class="tb-card__title"><?php esc_html_e('Book Your Transfer', 'transfers-booking'); ?></h3>

    <div class="tb-form">
        <!-- Transfer Type -->
        <div class="tb-form-group">
            <label class="tb-label" for="tb-transfer-type"><?php esc_html_e('Transfer Type', 'transfers-booking'); ?></label>
            <select id="tb-transfer-type" class="tb-select">
                <option value=""><?php esc_html_e('Select type...', 'transfers-booking'); ?></option>
            </select>
            <div class="tb-field-error" data-field="transferType"></div>
        </div>

        <!-- Pickup Location -->
        <div class="tb-form-group">
            <label class="tb-label" for="tb-pickup-location"><?php esc_html_e('Pickup Location', 'transfers-booking'); ?></label>
            <div class="tb-input-wrapper">
                <span class="tb-input-icon">&#9679;</span>
                <input type="text" id="tb-pickup-location" class="tb-input" placeholder="<?php esc_attr_e('City, airport, or hotel...', 'transfers-booking'); ?>" autocomplete="off">
                <div class="tb-autocomplete-dropdown" id="tb-pickup-dropdown"></div>
            </div>
            <div class="tb-field-error" data-field="pickup"></div>
        </div>

        <!-- Dropoff Location -->
        <div class="tb-form-group">
            <label class="tb-label" for="tb-dropoff-location"><?php esc_html_e('Drop-off Location', 'transfers-booking'); ?></label>
            <div class="tb-input-wrapper">
                <span class="tb-input-icon">&#9650;</span>
                <input type="text" id="tb-dropoff-location" class="tb-input" placeholder="<?php esc_attr_e('City, airport, or hotel...', 'transfers-booking'); ?>" autocomplete="off">
                <div class="tb-autocomplete-dropdown" id="tb-dropoff-dropdown"></div>
            </div>
            <div class="tb-field-error" data-field="dropoff"></div>
        </div>

        <!-- Date & Time -->
        <div class="tb-form-row">
            <div class="tb-form-group tb-form-group--half">
                <label class="tb-label" for="tb-pickup-datetime"><?php esc_html_e('Date & Time', 'transfers-booking'); ?></label>
                <input type="datetime-local" id="tb-pickup-datetime" class="tb-input">
                <div class="tb-field-error" data-field="datetime"></div>
            </div>
            <div class="tb-form-group tb-form-group--half">
                <label class="tb-label" for="tb-passengers"><?php esc_html_e('Passengers', 'transfers-booking'); ?></label>
                <div class="tb-counter">
                    <button type="button" class="tb-counter__btn" data-action="decrease" data-target="tb-passengers">-</button>
                    <input type="number" id="tb-passengers" class="tb-counter__value" value="1" min="1" max="20" readonly>
                    <button type="button" class="tb-counter__btn" data-action="increase" data-target="tb-passengers">+</button>
                </div>
            </div>
        </div>

        <!-- Round Trip (if enabled) -->
        <div class="tb-form-group" id="tb-round-trip-group" style="display: none;">
            <label class="tb-checkbox-label">
                <input type="checkbox" id="tb-round-trip">
                <span><?php esc_html_e('Round trip', 'transfers-booking'); ?></span>
            </label>
        </div>

        <!-- Return Date (shown when round trip is checked) -->
        <div class="tb-form-group" id="tb-return-datetime-group" style="display: none;">
            <label class="tb-label" for="tb-return-datetime"><?php esc_html_e('Return Date & Time', 'transfers-booking'); ?></label>
            <input type="datetime-local" id="tb-return-datetime" class="tb-input">
            <div class="tb-field-error" data-field="returnDatetime"></div>
        </div>

        <!-- Flight Number (if enabled, shown for airport types) -->
        <div class="tb-form-group" id="tb-flight-group" style="display: none;">
            <label class="tb-label" for="tb-flight-number"><?php esc_html_e('Flight Number', 'transfers-booking'); ?></label>
            <input type="text" id="tb-flight-number" class="tb-input" placeholder="<?php esc_attr_e('e.g. AT 1234', 'transfers-booking'); ?>">
        </div>

        <!-- No Route Message (injected by JS) -->
        <div id="tb-no-route-container" style="display:none;"></div>

        <!-- Actions -->
        <div class="tb-form-actions">
            <button type="button" id="tb-btn-search" class="tb-btn tb-btn--primary tb-btn--full">
                <?php esc_html_e('Search Vehicles', 'transfers-booking'); ?>
            </button>
        </div>
    </div>
</div>
