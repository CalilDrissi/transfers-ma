<?php
/**
 * Tours listing page template.
 * Filter bar + grid of tour cards using template cloning.
 */
defined('ABSPATH') || exit;
?>
<div id="tb-tours-listing" class="tb-tours-listing" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <div class="tb-tours-listing__header">
        <h1 class="tb-tours-listing__title"><?php esc_html_e('Day Trips & Tours', 'transfers-booking'); ?></h1>
        <p class="tb-tours-listing__subtitle"><?php esc_html_e('Discover Morocco with our curated experiences', 'transfers-booking'); ?></p>
    </div>

    <!-- Filter bar -->
    <div class="tb-tours-listing__filters">
        <div class="tb-tours-listing__filter">
            <select id="tb-tours-filter-type" class="tb-tours-listing__select">
                <option value=""><?php esc_html_e('All Types', 'transfers-booking'); ?></option>
                <option value="day_trip"><?php esc_html_e('Day Trip', 'transfers-booking'); ?></option>
                <option value="half_day"><?php esc_html_e('Half Day', 'transfers-booking'); ?></option>
                <option value="multi_day"><?php esc_html_e('Multi-Day', 'transfers-booking'); ?></option>
                <option value="private"><?php esc_html_e('Private', 'transfers-booking'); ?></option>
                <option value="group"><?php esc_html_e('Group', 'transfers-booking'); ?></option>
            </select>
        </div>
        <div class="tb-tours-listing__filter">
            <select id="tb-tours-filter-city" class="tb-tours-listing__select">
                <option value=""><?php esc_html_e('All Cities', 'transfers-booking'); ?></option>
            </select>
        </div>
        <div class="tb-tours-listing__filter">
            <select id="tb-tours-filter-price" class="tb-tours-listing__select">
                <option value=""><?php esc_html_e('Any Price', 'transfers-booking'); ?></option>
                <option value="0-500"><?php esc_html_e('Under 500 MAD', 'transfers-booking'); ?></option>
                <option value="500-1000">500 - 1,000 MAD</option>
                <option value="1000-2000">1,000 - 2,000 MAD</option>
                <option value="2000+"><?php esc_html_e('Over 2,000 MAD', 'transfers-booking'); ?></option>
            </select>
        </div>
        <div class="tb-tours-listing__filter">
            <select id="tb-tours-filter-sort" class="tb-tours-listing__select">
                <option value="featured"><?php esc_html_e('Featured', 'transfers-booking'); ?></option>
                <option value="price_low"><?php esc_html_e('Price: Low to High', 'transfers-booking'); ?></option>
                <option value="price_high"><?php esc_html_e('Price: High to Low', 'transfers-booking'); ?></option>
                <option value="name"><?php esc_html_e('Name A-Z', 'transfers-booking'); ?></option>
            </select>
        </div>
    </div>

    <!-- Loading -->
    <div id="tb-tours-loading" class="tb-tours-listing__loading">
        <div class="tb-tours-listing__spinner"></div>
        <p><?php esc_html_e('Loading tours...', 'transfers-booking'); ?></p>
    </div>

    <!-- Empty state -->
    <div id="tb-tours-empty" class="tb-tours-listing__empty" style="display:none;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 4l6 12 14 2-10 10 2 14-12-6-12 6 2-14L4 18l14-2z" stroke="#94A3B8" stroke-width="2" fill="none"/></svg>
        <p><?php esc_html_e('No tours found matching your criteria.', 'transfers-booking'); ?></p>
    </div>

    <!-- Grid -->
    <div id="tb-tours-grid" class="tb-tours-listing__grid" style="display:none;"></div>

    <!-- Tour card template -->
    <template id="tb-tours-card-template">
        <div class="tb-tours-card">
            <div class="tb-tours-card__image-wrap">
                <img class="tb-tours-card__image" src="" alt="" loading="lazy">
                <span class="tb-tours-card__badge tb-tours-card__badge--featured" style="display:none;"><?php esc_html_e('Featured', 'transfers-booking'); ?></span>
                <span class="tb-tours-card__badge tb-tours-card__badge--type"></span>
            </div>
            <div class="tb-tours-card__body">
                <h3 class="tb-tours-card__name"></h3>
                <p class="tb-tours-card__description"></p>
                <div class="tb-tours-card__meta">
                    <span class="tb-tours-card__meta-item tb-tours-card__meta-duration">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        <span class="tb-tours-card__duration-text"></span>
                    </span>
                    <span class="tb-tours-card__meta-item tb-tours-card__meta-city">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a4 4 0 00-4 4c0 3 4 7 4 7s4-4 4-7a4 4 0 00-4-4zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/></svg>
                        <span class="tb-tours-card__city-text"></span>
                    </span>
                </div>
                <div class="tb-tours-card__footer">
                    <div class="tb-tours-card__price">
                        <span class="tb-tours-card__price-label"><?php esc_html_e('From', 'transfers-booking'); ?></span>
                        <span class="tb-tours-card__price-value"></span>
                        <span class="tb-tours-card__price-unit"></span>
                    </div>
                    <a href="#" class="tb-tours-card__btn"><?php esc_html_e('View Details', 'transfers-booking'); ?></a>
                </div>
            </div>
        </div>
    </template>
</div>
