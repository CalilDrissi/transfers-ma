<?php
/**
 * Results page template.
 * Rendered by [transfers_results] shortcode.
 */
defined('ABSPATH') || exit;
$dir = is_rtl() ? 'rtl' : 'ltr';
?>
<div class="tb-results" id="tb-results" dir="<?php echo esc_attr($dir); ?>">

    <!-- Compact Search Bar -->
    <div class="tb-results__search-bar" id="tb-results-search-bar">
        <div class="tb-results__search-fields">
            <div class="tb-results__search-field" data-field="route">
                <span class="tb-results__search-label"><?php esc_html_e('Route', 'transfers-booking'); ?></span>
                <span class="tb-results__search-value" id="tb-results-route-display">--</span>
            </div>
            <div class="tb-results__search-divider"></div>
            <div class="tb-results__search-field" data-field="date">
                <span class="tb-results__search-label"><?php esc_html_e('Date', 'transfers-booking'); ?></span>
                <span class="tb-results__search-value" id="tb-results-date-display">--</span>
            </div>
            <div class="tb-results__search-divider"></div>
            <div class="tb-results__search-field" data-field="passengers">
                <span class="tb-results__search-label"><?php esc_html_e('Passengers', 'transfers-booking'); ?></span>
                <span class="tb-results__search-value" id="tb-results-pax-display">--</span>
            </div>
        </div>
        <button type="button" class="tb-results__modify-btn" id="tb-results-modify-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <?php esc_html_e('Modify', 'transfers-booking'); ?>
        </button>

        <!-- Edit mode (hidden by default) -->
        <div class="tb-results__search-edit" id="tb-results-search-edit" style="display:none">
            <div class="tb-results__edit-row">
                <div class="tb-results__edit-field">
                    <label><?php esc_html_e('From', 'transfers-booking'); ?></label>
                    <input type="text" id="tb-results-edit-from" class="tb-results__edit-input" autocomplete="off">
                    <input type="hidden" id="tb-results-edit-from-lat">
                    <input type="hidden" id="tb-results-edit-from-lng">
                    <div class="tb-results__edit-autocomplete" data-for="edit-from"></div>
                </div>
                <div class="tb-results__edit-field">
                    <label><?php esc_html_e('To', 'transfers-booking'); ?></label>
                    <input type="text" id="tb-results-edit-to" class="tb-results__edit-input" autocomplete="off">
                    <input type="hidden" id="tb-results-edit-to-lat">
                    <input type="hidden" id="tb-results-edit-to-lng">
                    <div class="tb-results__edit-autocomplete" data-for="edit-to"></div>
                </div>
                <div class="tb-results__edit-field">
                    <label><?php esc_html_e('Date', 'transfers-booking'); ?></label>
                    <input type="datetime-local" id="tb-results-edit-date" class="tb-results__edit-input">
                </div>
                <div class="tb-results__edit-field tb-results__edit-field--small">
                    <label><?php esc_html_e('Passengers', 'transfers-booking'); ?></label>
                    <input type="number" id="tb-results-edit-pax" class="tb-results__edit-input" min="1" max="20" value="2">
                </div>
                <div class="tb-results__edit-field tb-results__edit-field--small">
                    <label><?php esc_html_e('Luggage', 'transfers-booking'); ?></label>
                    <input type="number" id="tb-results-edit-luggage" class="tb-results__edit-input" min="0" max="20" value="2">
                </div>
            </div>
            <div class="tb-results__edit-actions">
                <button type="button" class="tb-results__update-btn" id="tb-results-update-btn">
                    <?php esc_html_e('Update Search', 'transfers-booking'); ?>
                </button>
                <button type="button" class="tb-results__cancel-btn" id="tb-results-cancel-btn">
                    <?php esc_html_e('Cancel', 'transfers-booking'); ?>
                </button>
            </div>
        </div>
    </div>

    <!-- Route Summary -->
    <div class="tb-results__route-summary" id="tb-results-route-summary">
        <div class="tb-results__route-line">
            <span class="tb-results__route-dot tb-results__route-dot--from"></span>
            <span class="tb-results__route-from" id="tb-results-from-name">--</span>
            <span class="tb-results__route-dash"></span>
            <span class="tb-results__route-to" id="tb-results-to-name">--</span>
            <span class="tb-results__route-dot tb-results__route-dot--to"></span>
        </div>
        <div class="tb-results__route-meta">
            <span class="tb-results__meta-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                <span id="tb-results-distance">--</span>
            </span>
            <span class="tb-results__meta-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 4v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                <span id="tb-results-duration">--</span>
            </span>
            <span class="tb-results__meta-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 1v2M10 1v2M1.5 5.5h11M2.5 2.5h9a1 1 0 011 1v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                <span id="tb-results-date-meta">--</span>
            </span>
            <span class="tb-results__meta-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 12.5c0-1.93 2.24-3.5 5-3.5s5 1.57 5 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                <span id="tb-results-pax-meta">--</span>
            </span>
        </div>
    </div>

    <!-- Route Notice Banner -->
    <div class="tb-results__notice" id="tb-results-notice" style="display:none"></div>

    <!-- Route Info -->
    <div class="tb-results__route-info" id="tb-results-route-info" style="display:none">
        <div class="tb-results__info-description" id="tb-results-description"></div>
        <div class="tb-results__info-highlights" id="tb-results-highlights"></div>
        <div class="tb-results__info-amenities" id="tb-results-amenities"></div>
        <div class="tb-results__info-tips" id="tb-results-tips" style="display:none">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1a5 5 0 015 5c0 2-1.5 3-2 4-.3.7-.5 1.5-.5 2H6.5c0-.5-.2-1.3-.5-2C5.5 9 4 8 4 6a5 5 0 015-5zM6.5 14h5M7 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span id="tb-results-tips-text"></span>
        </div>
        <div class="tb-results__info-traffic" id="tb-results-traffic" style="display:none"></div>
    </div>

    <!-- Pickup Zone Info -->
    <div class="tb-results__pickup-info" id="tb-results-pickup-info" style="display:none">
        <div class="tb-results__pickup-notice" id="tb-results-pickup-notice"></div>
        <div class="tb-results__pickup-instructions" id="tb-results-pickup-instructions"></div>
    </div>

    <!-- Loading State -->
    <div class="tb-results__loading" id="tb-results-loading">
        <div class="tb-results__spinner"></div>
        <p class="tb-results__loading-text"><?php esc_html_e('Searching for available vehicles...', 'transfers-booking'); ?></p>
    </div>

    <!-- Empty State -->
    <div class="tb-results__empty" id="tb-results-empty" style="display:none">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.84 0-16-7.16-16-16S15.16 8 24 8s16 7.16 16 16-7.16 16-16 16zm-2-22h4v12h-4V18zm0 16h4v4h-4v-4z" fill="currentColor"/></svg>
        <p class="tb-results__empty-message"><?php esc_html_e('No vehicles available for this route. Try a different route or date.', 'transfers-booking'); ?></p>
        <a href="<?php echo esc_url(home_url('/')); ?>" class="tb-results__back-btn"><?php esc_html_e('Back to Search', 'transfers-booking'); ?></a>
    </div>

    <!-- Vehicle Cards Container -->
    <div class="tb-results__vehicles" id="tb-results-vehicles"></div>

    <!-- Vehicle Card Template -->
    <template id="tb-results-vehicle-template">
        <div class="tb-results__vehicle-card" data-vehicle-id="">
            <div class="tb-results__vehicle-image">
                <img src="" alt="" class="tb-results__vehicle-img">
                <span class="tb-results__vehicle-popular" style="display:none"><?php esc_html_e('Popular', 'transfers-booking'); ?></span>
            </div>
            <div class="tb-results__vehicle-content">
                <h3 class="tb-results__vehicle-category"></h3>
                <p class="tb-results__vehicle-tagline"></p>
                <p class="tb-results__vehicle-name"></p>
                <div class="tb-results__vehicle-specs">
                    <span class="tb-results__spec">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 12.5c0-1.93 2.24-3.5 5-3.5s5 1.57 5 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        <span class="tb-results__spec-pax"></span>
                    </span>
                    <span class="tb-results__spec">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 3.5V2A1 1 0 015.5 1h3A1 1 0 019.5 2v1.5M1.5 4.5h11a.5.5 0 01.5.5v6.5a1 1 0 01-1 1h-10a1 1 0 01-1-1V5a.5.5 0 01.5-.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        <span class="tb-results__spec-luggage"></span>
                    </span>
                </div>
                <div class="tb-results__vehicle-features"></div>
                <p class="tb-results__vehicle-key-features"></p>
                <p class="tb-results__vehicle-description"></p>
                <div class="tb-results__vehicle-note" style="display:none"></div>
            </div>
            <div class="tb-results__vehicle-price">
                <div class="tb-results__price-amount">
                    <span class="tb-results__price-value"></span>
                    <span class="tb-results__price-currency"></span>
                </div>
                <span class="tb-results__price-deposit"></span>
                <button type="button" class="tb-results__book-btn"><?php esc_html_e('Book Now', 'transfers-booking'); ?></button>
            </div>
        </div>
    </template>

    <!-- Extras Section -->
    <div class="tb-results__extras" id="tb-results-extras" style="display:none">
        <h3 class="tb-results__extras-title"><?php esc_html_e('Add Extras', 'transfers-booking'); ?></h3>
        <div class="tb-results__extras-grid" id="tb-results-extras-grid"></div>
    </div>

</div>
