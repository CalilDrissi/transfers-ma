<?php
/**
 * Rental results page template.
 * Rendered by [rental_results] shortcode.
 */
defined('ABSPATH') || exit;
$dir = is_rtl() ? 'rtl' : 'ltr';
?>
<div class="tb-rental-results" id="tb-rental-results" dir="<?php echo esc_attr($dir); ?>">

    <!-- Search Summary Bar -->
    <div class="tb-rental-results__search-bar" id="tb-rental-search-bar">
        <div class="tb-rental-results__search-fields">
            <div class="tb-rental-results__search-field">
                <span class="tb-rental-results__search-label"><?php esc_html_e('City', 'transfers-booking'); ?></span>
                <span class="tb-rental-results__search-value" id="tb-rental-city-display">--</span>
            </div>
            <div class="tb-rental-results__search-divider"></div>
            <div class="tb-rental-results__search-field">
                <span class="tb-rental-results__search-label"><?php esc_html_e('Pickup', 'transfers-booking'); ?></span>
                <span class="tb-rental-results__search-value" id="tb-rental-pickup-display">--</span>
            </div>
            <div class="tb-rental-results__search-divider"></div>
            <div class="tb-rental-results__search-field">
                <span class="tb-rental-results__search-label"><?php esc_html_e('Return', 'transfers-booking'); ?></span>
                <span class="tb-rental-results__search-value" id="tb-rental-return-display">--</span>
            </div>
            <div class="tb-rental-results__search-divider"></div>
            <div class="tb-rental-results__search-field">
                <span class="tb-rental-results__search-label"><?php esc_html_e('Days', 'transfers-booking'); ?></span>
                <span class="tb-rental-results__search-value" id="tb-rental-days-display">--</span>
            </div>
        </div>

        <div class="tb-rental-results__sort">
            <label for="tb-rental-sort" class="tb-rental-results__sort-label"><?php esc_html_e('Sort by', 'transfers-booking'); ?></label>
            <select id="tb-rental-sort" class="tb-rental-results__sort-select">
                <option value="price_asc"><?php esc_html_e('Price: Low to High', 'transfers-booking'); ?></option>
                <option value="price_desc"><?php esc_html_e('Price: High to Low', 'transfers-booking'); ?></option>
                <option value="rating_desc"><?php esc_html_e('Rating: Best First', 'transfers-booking'); ?></option>
            </select>
        </div>
    </div>

    <div class="tb-rental-results__layout">

        <!-- Left Sidebar: Filters -->
        <aside class="tb-rental-filters" id="tb-rental-filters">
            <h3 class="tb-rental-filters__title"><?php esc_html_e('Filters', 'transfers-booking'); ?></h3>

            <!-- Category Filter -->
            <div class="tb-rental-filters__group">
                <h4 class="tb-rental-filters__group-title"><?php esc_html_e('Category', 'transfers-booking'); ?></h4>
                <div class="tb-rental-filters__options" id="tb-rental-filter-category">
                    <!-- Populated by JS -->
                </div>
            </div>

            <!-- Transmission Filter -->
            <div class="tb-rental-filters__group">
                <h4 class="tb-rental-filters__group-title"><?php esc_html_e('Transmission', 'transfers-booking'); ?></h4>
                <div class="tb-rental-filters__options" id="tb-rental-filter-transmission">
                    <label class="tb-rental-filters__option">
                        <input type="checkbox" value="automatic" data-filter="transmission">
                        <span><?php esc_html_e('Automatic', 'transfers-booking'); ?></span>
                    </label>
                    <label class="tb-rental-filters__option">
                        <input type="checkbox" value="manual" data-filter="transmission">
                        <span><?php esc_html_e('Manual', 'transfers-booking'); ?></span>
                    </label>
                </div>
            </div>

            <!-- Fuel Type Filter -->
            <div class="tb-rental-filters__group">
                <h4 class="tb-rental-filters__group-title"><?php esc_html_e('Fuel Type', 'transfers-booking'); ?></h4>
                <div class="tb-rental-filters__options" id="tb-rental-filter-fuel">
                    <label class="tb-rental-filters__option">
                        <input type="checkbox" value="gasoline" data-filter="fuel_type">
                        <span><?php esc_html_e('Gasoline', 'transfers-booking'); ?></span>
                    </label>
                    <label class="tb-rental-filters__option">
                        <input type="checkbox" value="diesel" data-filter="fuel_type">
                        <span><?php esc_html_e('Diesel', 'transfers-booking'); ?></span>
                    </label>
                    <label class="tb-rental-filters__option">
                        <input type="checkbox" value="hybrid" data-filter="fuel_type">
                        <span><?php esc_html_e('Hybrid', 'transfers-booking'); ?></span>
                    </label>
                    <label class="tb-rental-filters__option">
                        <input type="checkbox" value="electric" data-filter="fuel_type">
                        <span><?php esc_html_e('Electric', 'transfers-booking'); ?></span>
                    </label>
                </div>
            </div>

            <!-- Price Range -->
            <div class="tb-rental-filters__group">
                <h4 class="tb-rental-filters__group-title"><?php esc_html_e('Daily Price', 'transfers-booking'); ?></h4>
                <div class="tb-rental-filters__price-range">
                    <input type="range" id="tb-rental-filter-price" class="tb-rental-filters__range" min="0" max="5000" step="50" value="5000">
                    <div class="tb-rental-filters__price-labels">
                        <span>0</span>
                        <span id="tb-rental-filter-price-value">5000</span>
                    </div>
                </div>
            </div>

            <button type="button" class="tb-rental-filters__clear" id="tb-rental-filters-clear">
                <?php esc_html_e('Clear Filters', 'transfers-booking'); ?>
            </button>
        </aside>

        <!-- Main Area -->
        <div class="tb-rental-results__main">

            <!-- Loading State -->
            <div class="tb-rental-results__loading" id="tb-rental-loading">
                <div class="tb-rental-results__skeleton">
                    <div class="tb-rental-card tb-rental-card--skeleton">
                        <div class="tb-rental-card__image-placeholder"></div>
                        <div class="tb-rental-card__content-placeholder">
                            <div class="tb-rental-card__line tb-rental-card__line--title"></div>
                            <div class="tb-rental-card__line tb-rental-card__line--short"></div>
                            <div class="tb-rental-card__line tb-rental-card__line--medium"></div>
                        </div>
                    </div>
                    <div class="tb-rental-card tb-rental-card--skeleton">
                        <div class="tb-rental-card__image-placeholder"></div>
                        <div class="tb-rental-card__content-placeholder">
                            <div class="tb-rental-card__line tb-rental-card__line--title"></div>
                            <div class="tb-rental-card__line tb-rental-card__line--short"></div>
                            <div class="tb-rental-card__line tb-rental-card__line--medium"></div>
                        </div>
                    </div>
                    <div class="tb-rental-card tb-rental-card--skeleton">
                        <div class="tb-rental-card__image-placeholder"></div>
                        <div class="tb-rental-card__content-placeholder">
                            <div class="tb-rental-card__line tb-rental-card__line--title"></div>
                            <div class="tb-rental-card__line tb-rental-card__line--short"></div>
                            <div class="tb-rental-card__line tb-rental-card__line--medium"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div class="tb-rental-results__empty" id="tb-rental-empty" style="display:none;">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.84 0-16-7.16-16-16S15.16 8 24 8s16 7.16 16 16-7.16 16-16 16zm-2-22h4v12h-4V18zm0 16h4v4h-4v-4z" fill="currentColor"/></svg>
                <p class="tb-rental-results__empty-title"><?php esc_html_e('No cars available', 'transfers-booking'); ?></p>
                <p class="tb-rental-results__empty-text"><?php esc_html_e('Try different dates or another city.', 'transfers-booking'); ?></p>
            </div>

            <!-- Vehicle Cards Grid -->
            <div class="tb-rental-grid" id="tb-rental-grid"></div>

            <!-- Pagination -->
            <div class="tb-rental-results__pagination" id="tb-rental-pagination" style="display:none;">
                <button type="button" class="tb-rental-results__page-btn tb-rental-results__page-btn--prev" id="tb-rental-prev" disabled>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <?php esc_html_e('Previous', 'transfers-booking'); ?>
                </button>
                <span class="tb-rental-results__page-info" id="tb-rental-page-info"></span>
                <button type="button" class="tb-rental-results__page-btn tb-rental-results__page-btn--next" id="tb-rental-next">
                    <?php esc_html_e('Next', 'transfers-booking'); ?>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Vehicle Card Template -->
    <template id="tb-rental-card-template">
        <div class="tb-rental-card" data-vehicle-id="">
            <div class="tb-rental-card__image">
                <img src="" alt="" class="tb-rental-card__img" loading="lazy">
            </div>
            <div class="tb-rental-card__body">
                <div class="tb-rental-card__header">
                    <h3 class="tb-rental-card__name"></h3>
                    <span class="tb-rental-card__category"></span>
                </div>
                <div class="tb-rental-card__company">
                    <img src="" alt="" class="tb-rental-card__company-logo">
                    <span class="tb-rental-card__company-name"></span>
                    <span class="tb-rental-card__rating">
                        <span class="tb-rating-stars"></span>
                        <span class="tb-rental-card__rating-value"></span>
                    </span>
                </div>
                <div class="tb-rental-card__specs">
                    <span class="tb-spec-icon" data-spec="passengers">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 12.5c0-1.93 2.24-3.5 5-3.5s5 1.57 5 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        <span class="tb-spec-icon__value"></span>
                    </span>
                    <span class="tb-spec-icon" data-spec="luggage">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 3.5V2A1 1 0 015.5 1h3A1 1 0 019.5 2v1.5M1.5 4.5h11a.5.5 0 01.5.5v6.5a1 1 0 01-1 1h-10a1 1 0 01-1-1V5a.5.5 0 01.5-.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        <span class="tb-spec-icon__value"></span>
                    </span>
                    <span class="tb-spec-icon" data-spec="doors">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/><circle cx="10" cy="7" r="1" fill="currentColor"/></svg>
                        <span class="tb-spec-icon__value"></span>
                    </span>
                    <span class="tb-spec-icon" data-spec="transmission">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2v10M7 2v6M11 2v10M3 8h4M7 8h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        <span class="tb-spec-icon__value"></span>
                    </span>
                </div>
                <div class="tb-rental-card__features"></div>
                <div class="tb-rental-card__pricing">
                    <div class="tb-rental-card__price-daily">
                        <span class="tb-rental-card__price-value"></span>
                        <span class="tb-rental-card__price-period"><?php esc_html_e('/day', 'transfers-booking'); ?></span>
                    </div>
                    <div class="tb-rental-card__price-total">
                        <span class="tb-rental-card__total-label"><?php esc_html_e('Total:', 'transfers-booking'); ?></span>
                        <span class="tb-rental-card__total-value"></span>
                    </div>
                </div>
                <button type="button" class="tb-rental-card__book-btn"><?php esc_html_e('Book Now', 'transfers-booking'); ?></button>
            </div>
        </div>
    </template>
</div>
