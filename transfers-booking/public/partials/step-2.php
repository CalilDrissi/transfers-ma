<?php defined('ABSPATH') || exit; ?>

<!-- Back Button -->
<button type="button" class="tb-btn-back" data-back="1">
    &larr; <?php esc_html_e('Back to search', 'transfers-booking'); ?>
</button>

<!-- Route Summary Bar (compact, like SinaiTaxi) -->
<div class="tb-route-bar">
    <div class="tb-route-bar__point">
        <span class="tb-route-bar__icon tb-route-bar__icon--pickup">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
        </span>
        <div class="tb-route-bar__info">
            <span class="tb-route-bar__label"><?php esc_html_e('Pickup', 'transfers-booking'); ?></span>
            <span class="tb-route-bar__address" id="tb-result-pickup">--</span>
        </div>
    </div>
    <div class="tb-route-bar__swap-icon">&lrhar;</div>
    <div class="tb-route-bar__point">
        <span class="tb-route-bar__icon tb-route-bar__icon--dropoff">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C5.5 1 3.5 3 3.5 5.5C3.5 9 8 14 8 14s4.5-5 4.5-8.5C12.5 3 10.5 1 8 1z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="5.5" r="1.5" stroke="currentColor" stroke-width="1.3"/></svg>
        </span>
        <div class="tb-route-bar__info">
            <span class="tb-route-bar__label"><?php esc_html_e('Drop-off', 'transfers-booking'); ?></span>
            <span class="tb-route-bar__address" id="tb-result-dropoff">--</span>
        </div>
    </div>
    <div class="tb-route-bar__meta">
        <span class="tb-route-bar__date" id="tb-result-date">--</span>
        <span class="tb-route-bar__distance" id="tb-result-distance">--</span>
        <span class="tb-route-bar__duration" id="tb-result-duration">--</span>
    </div>
</div>

<!-- Trust Badges -->
<div class="tb-trust-strip">
    <span class="tb-trust-strip__badge">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <?php esc_html_e('Free Cancellation', 'transfers-booking'); ?>
    </span>
    <span class="tb-trust-strip__badge">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        <?php esc_html_e('24/7 Support', 'transfers-booking'); ?>
    </span>
</div>

<!-- Route Map -->
<div id="tb-route-map" class="tb-route-map"></div>

<!-- Route/Zone Notice -->
<div id="tb-route-notice"></div>
<div id="tb-route-details"></div>

<!-- Vehicle List -->
<h4 class="tb-section-title"><?php esc_html_e('Choose your vehicle', 'transfers-booking'); ?></h4>
<div id="tb-vehicles-container" class="tb-vehicles-container">
    <div class="tb-loading"><?php esc_html_e('Loading vehicles...', 'transfers-booking'); ?></div>
</div>

<!-- Extras -->
<div id="tb-extras-section" class="tb-extras-section" style="display: none;">
    <h4 class="tb-section-title"><?php esc_html_e('Additional services and goods', 'transfers-booking'); ?></h4>
    <p class="tb-section-subtitle"><?php esc_html_e('Optional services to enhance your journey', 'transfers-booking'); ?></p>
    <div id="tb-extras-container"></div>
</div>

<!-- How it Works -->
<div class="tb-how-it-works">
    <h4 class="tb-section-title"><?php esc_html_e('How it Works', 'transfers-booking'); ?></h4>
    <div class="tb-how-it-works__steps">
        <div class="tb-how-it-works__step">
            <div class="tb-how-it-works__number">1</div>
            <div>
                <h5><?php esc_html_e('Select Your Route and Car', 'transfers-booking'); ?></h5>
                <p><?php esc_html_e('Enter your pick-up and drop-off locations, choose your preferred car.', 'transfers-booking'); ?></p>
            </div>
        </div>
        <div class="tb-how-it-works__step">
            <div class="tb-how-it-works__number">2</div>
            <div>
                <h5><?php esc_html_e('Provide Booking Details', 'transfers-booking'); ?></h5>
                <p><?php esc_html_e('Fill in your details and select extra services you might need.', 'transfers-booking'); ?></p>
            </div>
        </div>
        <div class="tb-how-it-works__step">
            <div class="tb-how-it-works__number">3</div>
            <div>
                <h5><?php esc_html_e('Enjoy the Ride', 'transfers-booking'); ?></h5>
                <p><?php esc_html_e('Our driver will arrive at your pick-up location on time.', 'transfers-booking'); ?></p>
            </div>
        </div>
    </div>
</div>

<!-- Continue Button -->
<button type="button" id="tb-btn-continue" class="tb-btn tb-btn--primary tb-btn--full" disabled>
    <?php esc_html_e('Continue', 'transfers-booking'); ?>
</button>

<!-- Hidden sidebar compat elements -->
<div style="display:none">
    <span id="tb-sidebar-route"></span>
    <span id="tb-sidebar-date"></span>
    <span id="tb-sidebar-vehicle"></span>
    <span id="tb-sidebar-passengers"></span>
    <div id="tb-sidebar-extras-list"></div>
    <span id="tb-sidebar-total"></span>
</div>
