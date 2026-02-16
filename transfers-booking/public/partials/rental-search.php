<?php
/**
 * Rental search widget template.
 * Variables available: $theme
 */
defined('ABSPATH') || exit;
$dir = is_rtl() ? 'rtl' : 'ltr';
?>
<div class="tb-rental-search-widget tb-rental-search-widget--<?php echo esc_attr($theme); ?>"
     id="tb-rental-search"
     dir="<?php echo esc_attr($dir); ?>">

    <h2 class="tb-rental-search-widget__title"><?php esc_html_e('Find Your Rental Car', 'transfers-booking'); ?></h2>

    <form class="tb-rental-search-widget__form" id="tb-rental-search-form" novalidate>
        <div class="tb-rental-search-widget__bar">

            <!-- City -->
            <div class="tb-rental-search-widget__field tb-rental-search-widget__field--city">
                <div class="tb-rental-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 118 4.5a1.75 1.75 0 010 3.5z" fill="currentColor"/></svg>
                </div>
                <div class="tb-rental-search-widget__field-content">
                    <label class="tb-rental-search-widget__label" for="tb-rental-city"><?php esc_html_e('Pickup City', 'transfers-booking'); ?></label>
                    <select id="tb-rental-city" class="tb-rental-search-widget__select" required>
                        <option value=""><?php esc_html_e('Loading cities...', 'transfers-booking'); ?></option>
                    </select>
                </div>
            </div>

            <div class="tb-rental-search-widget__divider"></div>

            <!-- Pickup Date -->
            <div class="tb-rental-search-widget__field tb-rental-search-widget__field--date">
                <div class="tb-rental-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 1v2M11 1v2M2 6h12M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="tb-rental-search-widget__field-content">
                    <label class="tb-rental-search-widget__label" for="tb-rental-pickup-date"><?php esc_html_e('Pickup Date', 'transfers-booking'); ?></label>
                    <input type="date" id="tb-rental-pickup-date" class="tb-rental-search-widget__input" required>
                </div>
            </div>

            <div class="tb-rental-search-widget__divider"></div>

            <!-- Return Date -->
            <div class="tb-rental-search-widget__field tb-rental-search-widget__field--date">
                <div class="tb-rental-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 1v2M11 1v2M2 6h12M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="tb-rental-search-widget__field-content">
                    <label class="tb-rental-search-widget__label" for="tb-rental-return-date"><?php esc_html_e('Return Date', 'transfers-booking'); ?></label>
                    <input type="date" id="tb-rental-return-date" class="tb-rental-search-widget__input" required>
                </div>
            </div>

            <div class="tb-rental-search-widget__divider"></div>

            <!-- Category Filter -->
            <div class="tb-rental-search-widget__field tb-rental-search-widget__field--category">
                <div class="tb-rental-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 3h14M1 8h14M1 13h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </div>
                <div class="tb-rental-search-widget__field-content">
                    <label class="tb-rental-search-widget__label" for="tb-rental-category"><?php esc_html_e('Category', 'transfers-booking'); ?></label>
                    <select id="tb-rental-category" class="tb-rental-search-widget__select">
                        <option value=""><?php esc_html_e('All Categories', 'transfers-booking'); ?></option>
                    </select>
                </div>
            </div>

            <!-- Search Button -->
            <button type="submit" class="tb-rental-search-widget__submit">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span><?php esc_html_e('Search Cars', 'transfers-booking'); ?></span>
            </button>
        </div>

        <div class="tb-rental-search-widget__error" id="tb-rental-search-error" style="display:none;"></div>
    </form>
</div>
