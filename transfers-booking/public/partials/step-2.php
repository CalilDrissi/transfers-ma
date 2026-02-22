<?php defined('ABSPATH') || exit; ?>

<!-- Back Button -->
<button type="button" class="tb-btn-back" data-back="1">
    &larr; <?php esc_html_e('Back to search', 'transfers-booking'); ?>
</button>

<!-- Route Summary -->
<div class="tb-route-summary">
    <div class="tb-route-points">
        <span class="tb-route-point">
            <span class="tb-route-dot tb-route-dot--pickup"></span>
            <span id="tb-result-pickup">--</span>
        </span>
        <span class="tb-route-arrow">&rarr;</span>
        <span class="tb-route-point">
            <span class="tb-route-dot tb-route-dot--dropoff"></span>
            <span id="tb-result-dropoff">--</span>
        </span>
    </div>
    <div class="tb-route-meta">
        <span id="tb-result-distance">--</span>
        <span id="tb-result-duration">--</span>
    </div>
</div>

<!-- Vehicle List -->
<h4 class="tb-section-title"><?php esc_html_e('Choose your vehicle', 'transfers-booking'); ?></h4>
<div id="tb-vehicles-container" class="tb-vehicles-container">
    <div class="tb-loading"><?php esc_html_e('Loading vehicles...', 'transfers-booking'); ?></div>
</div>

<!-- Extras -->
<div id="tb-extras-section" class="tb-extras-section" style="display: none;">
    <h4 class="tb-section-title"><?php esc_html_e('Add extras', 'transfers-booking'); ?></h4>
    <p class="tb-section-subtitle"><?php esc_html_e('Optional services to enhance your journey', 'transfers-booking'); ?></p>
    <div id="tb-extras-container"></div>
</div>

<!-- Continue Button -->
<button type="button" id="tb-btn-continue" class="tb-btn tb-btn--primary tb-btn--full" disabled>
    <?php esc_html_e('Continue', 'transfers-booking'); ?>
</button>

<!-- Hidden sidebar elements for JS compat -->
<div style="display:none">
    <span id="tb-sidebar-route"></span>
    <span id="tb-sidebar-date"></span>
    <span id="tb-sidebar-vehicle"></span>
    <span id="tb-sidebar-passengers"></span>
    <div id="tb-sidebar-extras-list"></div>
    <span id="tb-sidebar-total"></span>
</div>
