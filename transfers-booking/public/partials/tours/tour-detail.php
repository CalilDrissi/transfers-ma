<?php
/**
 * Tour detail page template.
 * Hero + two-column layout: content (left) + sticky booking card (right).
 */
defined('ABSPATH') || exit;
?>
<div id="tb-tour-detail" class="tb-tour-detail" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <!-- Loading -->
    <div id="tb-tour-loading" class="tb-tour-detail__loading">
        <div class="tb-tour-detail__spinner"></div>
        <p><?php esc_html_e('Loading tour details...', 'transfers-booking'); ?></p>
    </div>

    <!-- Error state -->
    <div id="tb-tour-error" class="tb-tour-detail__error" style="display:none;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#EF4444" stroke-width="2"/><path d="M24 16v10M24 30v2" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/></svg>
        <h2><?php esc_html_e('Tour Not Found', 'transfers-booking'); ?></h2>
        <p><?php esc_html_e('This tour could not be found or is no longer available.', 'transfers-booking'); ?></p>
        <a href="<?php echo esc_url(TB_Settings::get('tb_tours_page_url')); ?>" class="tb-tour-detail__btn"><?php esc_html_e('Browse All Tours', 'transfers-booking'); ?></a>
    </div>

    <!-- Content (shown after loading) -->
    <div id="tb-tour-content" class="tb-tour-detail__content" style="display:none;">

        <!-- Hero -->
        <div class="tb-tour-detail__hero" id="tb-tour-hero">
            <img class="tb-tour-detail__hero-img" id="tb-tour-hero-img" src="" alt="">
            <div class="tb-tour-detail__hero-overlay">
                <div class="tb-tour-detail__hero-inner">
                    <div class="tb-tour-detail__hero-badges">
                        <span class="tb-tour-detail__hero-badge" id="tb-tour-type-badge"></span>
                        <span class="tb-tour-detail__hero-badge" id="tb-tour-duration-badge">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                            <span id="tb-tour-duration-text"></span>
                        </span>
                        <span class="tb-tour-detail__hero-badge" id="tb-tour-city-badge">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a4 4 0 00-4 4c0 3 4 7 4 7s4-4 4-7a4 4 0 00-4-4z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
                            <span id="tb-tour-city-text"></span>
                        </span>
                    </div>
                    <h1 class="tb-tour-detail__hero-title" id="tb-tour-name"></h1>
                </div>
            </div>
        </div>

        <div class="tb-tour-detail__layout">

            <!-- LEFT: Content -->
            <div class="tb-tour-detail__main">

                <!-- Quick info bar -->
                <div class="tb-tour-detail__quick-info" id="tb-tour-quick-info">
                    <div class="tb-tour-detail__quick-item" id="tb-tour-qi-duration">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 4.5v3.5l2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                        <span id="tb-tour-qi-duration-text"></span>
                    </div>
                    <div class="tb-tour-detail__quick-item" id="tb-tour-qi-pax">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1.5c-3 0-5.5 1.5-5.5 3V14h11v-1.5c0-1.5-2.5-3-5.5-3z" fill="currentColor"/></svg>
                        <span id="tb-tour-qi-pax-text"></span>
                    </div>
                    <div class="tb-tour-detail__quick-item" id="tb-tour-qi-cancel">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span id="tb-tour-qi-cancel-text"></span>
                    </div>
                </div>

                <!-- Description -->
                <div class="tb-tour-detail__section" id="tb-tour-description-section">
                    <h2 class="tb-tour-detail__section-title"><?php esc_html_e('About This Tour', 'transfers-booking'); ?></h2>
                    <div class="tb-tour-detail__description" id="tb-tour-description"></div>
                </div>

                <!-- Highlights -->
                <div class="tb-tour-detail__section" id="tb-tour-highlights-section" style="display:none;">
                    <h2 class="tb-tour-detail__section-title"><?php esc_html_e('Highlights', 'transfers-booking'); ?></h2>
                    <div class="tb-tour-detail__highlights" id="tb-tour-highlights"></div>
                </div>

                <!-- Itinerary -->
                <div class="tb-tour-detail__section" id="tb-tour-itinerary-section" style="display:none;">
                    <h2 class="tb-tour-detail__section-title"><?php esc_html_e('Itinerary', 'transfers-booking'); ?></h2>
                    <div class="tb-tour-detail__itinerary" id="tb-tour-itinerary"></div>
                </div>

                <!-- Inclusions / Exclusions -->
                <div class="tb-tour-detail__section tb-tour-detail__incl-excl" id="tb-tour-incl-excl-section" style="display:none;">
                    <div class="tb-tour-detail__inclusions">
                        <h3 class="tb-tour-detail__section-subtitle"><?php esc_html_e("What's Included", 'transfers-booking'); ?></h3>
                        <ul class="tb-tour-detail__incl-list" id="tb-tour-inclusions"></ul>
                    </div>
                    <div class="tb-tour-detail__exclusions">
                        <h3 class="tb-tour-detail__section-subtitle"><?php esc_html_e("Not Included", 'transfers-booking'); ?></h3>
                        <ul class="tb-tour-detail__excl-list" id="tb-tour-exclusions"></ul>
                    </div>
                </div>

                <!-- Gallery -->
                <div class="tb-tour-detail__section" id="tb-tour-gallery-section" style="display:none;">
                    <h2 class="tb-tour-detail__section-title"><?php esc_html_e('Gallery', 'transfers-booking'); ?></h2>
                    <div class="tb-tour-detail__gallery" id="tb-tour-gallery"></div>
                </div>

                <!-- FAQ -->
                <div class="tb-tour-detail__section" id="tb-tour-faq-section" style="display:none;">
                    <h2 class="tb-tour-detail__section-title"><?php esc_html_e('FAQ', 'transfers-booking'); ?></h2>
                    <div class="tb-tour-detail__faq" id="tb-tour-faq"></div>
                </div>
            </div>

            <!-- RIGHT: Sticky Booking Card -->
            <div class="tb-tour-detail__sidebar">
                <div class="tb-tour-detail__booking-card" id="tb-tour-booking-card">

                    <!-- Price display -->
                    <div class="tb-tour-detail__price-display">
                        <div class="tb-tour-detail__price-main">
                            <span class="tb-tour-detail__price-from"><?php esc_html_e('From', 'transfers-booking'); ?></span>
                            <span class="tb-tour-detail__price-value" id="tb-tour-price-value"></span>
                            <span class="tb-tour-detail__price-currency" id="tb-tour-price-currency"></span>
                        </div>
                        <span class="tb-tour-detail__price-unit" id="tb-tour-price-unit"></span>
                    </div>

                    <!-- Date picker -->
                    <div class="tb-tour-detail__book-field">
                        <label class="tb-tour-detail__book-label" for="tb-tour-date"><?php esc_html_e('Date', 'transfers-booking'); ?></label>
                        <input type="date" id="tb-tour-date" class="tb-tour-detail__book-input" required>
                    </div>

                    <!-- Participants -->
                    <div class="tb-tour-detail__book-field">
                        <label class="tb-tour-detail__book-label"><?php esc_html_e('Participants', 'transfers-booking'); ?></label>
                        <div class="tb-tour-detail__pax-row">
                            <div class="tb-tour-detail__pax-group">
                                <span class="tb-tour-detail__pax-label"><?php esc_html_e('Adults', 'transfers-booking'); ?></span>
                                <div class="tb-tour-detail__stepper">
                                    <button type="button" class="tb-tour-detail__stepper-btn" data-action="decrease" data-target="tb-tour-adults">-</button>
                                    <span class="tb-tour-detail__stepper-value" id="tb-tour-adults">2</span>
                                    <button type="button" class="tb-tour-detail__stepper-btn" data-action="increase" data-target="tb-tour-adults">+</button>
                                </div>
                            </div>
                            <div class="tb-tour-detail__pax-group">
                                <span class="tb-tour-detail__pax-label"><?php esc_html_e('Children', 'transfers-booking'); ?></span>
                                <div class="tb-tour-detail__stepper">
                                    <button type="button" class="tb-tour-detail__stepper-btn" data-action="decrease" data-target="tb-tour-children">-</button>
                                    <span class="tb-tour-detail__stepper-value" id="tb-tour-children">0</span>
                                    <button type="button" class="tb-tour-detail__stepper-btn" data-action="increase" data-target="tb-tour-children">+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Private tour toggle -->
                    <div class="tb-tour-detail__book-field" id="tb-tour-private-field" style="display:none;">
                        <label class="tb-tour-detail__toggle">
                            <input type="checkbox" id="tb-tour-private" class="tb-tour-detail__toggle-input">
                            <span class="tb-tour-detail__toggle-slider"></span>
                            <span class="tb-tour-detail__toggle-label"><?php esc_html_e('Private Tour', 'transfers-booking'); ?></span>
                        </label>
                    </div>

                    <!-- Calculated total -->
                    <div class="tb-tour-detail__total">
                        <span class="tb-tour-detail__total-label"><?php esc_html_e('Total', 'transfers-booking'); ?></span>
                        <span class="tb-tour-detail__total-value" id="tb-tour-total"></span>
                    </div>

                    <!-- Book button -->
                    <button type="button" id="tb-tour-book-btn" class="tb-tour-detail__book-btn">
                        <?php esc_html_e('Book This Tour', 'transfers-booking'); ?>
                    </button>

                    <!-- Trust notes -->
                    <div class="tb-tour-detail__trust">
                        <div class="tb-tour-detail__trust-item">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <?php esc_html_e('Free cancellation 24h before', 'transfers-booking'); ?>
                        </div>
                        <div class="tb-tour-detail__trust-item">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3v4c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V3L7 1z" stroke="#2E8BFF" stroke-width="1.2" fill="none"/></svg>
                            <?php esc_html_e('Licensed local guides', 'transfers-booking'); ?>
                        </div>
                        <div class="tb-tour-detail__trust-item">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="2" stroke="#25D366" stroke-width="1.2"/><path d="M5 6l1.5 1.5L9 5" stroke="#25D366" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <?php esc_html_e('Instant confirmation', 'transfers-booking'); ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Gallery lightbox -->
    <div class="tb-tour-detail__lightbox" id="tb-tour-lightbox" style="display:none;">
        <div class="tb-tour-detail__lightbox-overlay"></div>
        <button type="button" class="tb-tour-detail__lightbox-close">&times;</button>
        <button type="button" class="tb-tour-detail__lightbox-prev">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <img class="tb-tour-detail__lightbox-img" id="tb-tour-lightbox-img" src="" alt="">
        <button type="button" class="tb-tour-detail__lightbox-next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
    </div>

    <!-- Mobile bottom bar -->
    <div class="tb-tour-detail__mobile-bar" id="tb-tour-mobile-bar" style="display:none;">
        <div class="tb-tour-detail__mobile-price">
            <span class="tb-tour-detail__mobile-price-label"><?php esc_html_e('From', 'transfers-booking'); ?></span>
            <span class="tb-tour-detail__mobile-price-value" id="tb-tour-mobile-price"></span>
        </div>
        <button type="button" class="tb-tour-detail__mobile-book-btn" id="tb-tour-mobile-book-btn">
            <?php esc_html_e('Book Now', 'transfers-booking'); ?>
        </button>
    </div>
</div>
