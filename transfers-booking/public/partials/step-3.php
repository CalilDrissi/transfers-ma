<?php defined('ABSPATH') || exit; ?>

<div class="tb-step3-layout">
    <!-- Left Column -->
    <div class="tb-step3-main">
        <!-- Back Button -->
        <button type="button" class="tb-btn-back" data-back="2">
            &larr; <?php esc_html_e('Back to vehicle', 'transfers-booking'); ?>
        </button>

        <!-- Customer Details -->
        <div class="tb-card">
            <h4 class="tb-card__title"><?php esc_html_e('Passenger Details', 'transfers-booking'); ?></h4>

            <div class="tb-form-row">
                <div class="tb-form-group tb-form-group--half">
                    <label class="tb-label" for="tb-customer-name"><?php esc_html_e('Full Name', 'transfers-booking'); ?> *</label>
                    <input type="text" id="tb-customer-name" class="tb-input" placeholder="<?php esc_attr_e('John Doe', 'transfers-booking'); ?>">
                    <div class="tb-field-error" data-field="name"></div>
                </div>
                <div class="tb-form-group tb-form-group--half">
                    <label class="tb-label" for="tb-customer-email"><?php esc_html_e('Email', 'transfers-booking'); ?> *</label>
                    <input type="email" id="tb-customer-email" class="tb-input" placeholder="<?php esc_attr_e('john@example.com', 'transfers-booking'); ?>">
                    <div class="tb-field-error" data-field="email"></div>
                </div>
            </div>
            <div class="tb-form-row">
                <div class="tb-form-group tb-form-group--half">
                    <label class="tb-label" for="tb-customer-phone"><?php esc_html_e('Phone', 'transfers-booking'); ?> *</label>
                    <input type="tel" id="tb-customer-phone" class="tb-input" placeholder="<?php esc_attr_e('+212 600 000 000', 'transfers-booking'); ?>">
                    <div class="tb-field-error" data-field="phone"></div>
                </div>
                <div class="tb-form-group tb-form-group--half">
                    <label class="tb-label" for="tb-special-requests"><?php esc_html_e('Special Requests', 'transfers-booking'); ?></label>
                    <input type="text" id="tb-special-requests" class="tb-input" placeholder="<?php esc_attr_e('Optional', 'transfers-booking'); ?>">
                </div>
            </div>
        </div>

        <!-- Payment -->
        <div class="tb-card" id="tb-payment-card">
            <h4 class="tb-card__title"><?php esc_html_e('Payment', 'transfers-booking'); ?></h4>

            <div id="tb-payment-errors" class="tb-alert tb-alert--error" style="display: none;"></div>

            <!-- Pay button (before Stripe mount) -->
            <button type="button" id="tb-pay-button" class="tb-btn tb-btn--primary tb-btn--full">
                <?php esc_html_e('Pay Now', 'transfers-booking'); ?>
            </button>

            <!-- Stripe Element (mounted after Pay) -->
            <div id="tb-stripe-element" style="display: none;"></div>

            <!-- Confirm button (after Stripe mount) -->
            <button type="button" id="tb-confirm-payment-btn" class="tb-btn tb-btn--primary tb-btn--full" style="display: none;">
                <?php esc_html_e('Confirm Payment', 'transfers-booking'); ?>
            </button>
        </div>
    </div>

    <!-- Right Column: Order Summary -->
    <div class="tb-step3-sidebar">
        <div class="tb-sidebar">
            <h5 class="tb-sidebar__title"><?php esc_html_e('Order Summary', 'transfers-booking'); ?></h5>

            <div class="tb-summary-item">
                <span class="tb-summary-label"><?php esc_html_e('Route', 'transfers-booking'); ?></span>
                <span class="tb-summary-value" id="tb-order-route">--</span>
            </div>
            <div class="tb-summary-item">
                <span class="tb-summary-label"><?php esc_html_e('Date & Time', 'transfers-booking'); ?></span>
                <span class="tb-summary-value" id="tb-order-datetime">--</span>
            </div>
            <div class="tb-summary-item">
                <span class="tb-summary-label"><?php esc_html_e('Vehicle', 'transfers-booking'); ?></span>
                <span class="tb-summary-value" id="tb-order-vehicle">--</span>
            </div>
            <div class="tb-summary-item">
                <span class="tb-summary-label"><?php esc_html_e('Passengers', 'transfers-booking'); ?></span>
                <span class="tb-summary-value" id="tb-order-passengers">--</span>
            </div>
            <div id="tb-order-extras-list"></div>
            <div class="tb-summary-item tb-summary-total">
                <span><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                <span id="tb-order-total">--</span>
            </div>
        </div>
    </div>
</div>
