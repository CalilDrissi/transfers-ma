<?php
/**
 * Search widget template.
 * Variables available: $instance_id, $theme, $layout, $show_tabs, $show_badges, $headline
 */
defined('ABSPATH') || exit;
$lang = isset($lang) ? $lang : '';
$fixed_origin = isset($fixed_origin) ? $fixed_origin : '';
$fixed_origin_lat = isset($fixed_origin_lat) ? $fixed_origin_lat : '';
$fixed_origin_lng = isset($fixed_origin_lng) ? $fixed_origin_lng : '';

$dir = is_rtl() ? 'rtl' : 'ltr';
// Override direction if lang is an RTL language
$rtl_langs = ['ar', 'he', 'fa', 'ur', 'ps', 'ku'];
if ($lang && in_array(substr($lang, 0, 2), $rtl_langs, true)) {
    $dir = 'rtl';
}
?>
<div class="tb-search-widget tb-search-widget--<?php echo esc_attr($theme); ?> tb-search-widget--<?php echo esc_attr($layout); ?>"
     data-instance="<?php echo esc_attr($instance_id); ?>"
     data-lang="<?php echo esc_attr($lang); ?>"
     data-fixed-origin="<?php echo esc_attr($fixed_origin); ?>"
     data-fixed-origin-lat="<?php echo esc_attr($fixed_origin_lat); ?>"
     data-fixed-origin-lng="<?php echo esc_attr($fixed_origin_lng); ?>"
     dir="<?php echo esc_attr($dir); ?>">

    <?php if ($show_tabs) : ?>
    <div class="tb-search-widget__tabs">
        <button type="button" class="tb-search-widget__tab tb-search-widget__tab--active" data-service="transfers">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5H11V3.5C11 2.12 9.88 1 8.5 1h-3C4.12 1 3 2.12 3 3.5V5H.5a.5.5 0 00-.5.5v2a.5.5 0 00.5.5H1v5.5a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0013 13V8h.5a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5zM4 3.5A1.5 1.5 0 015.5 2h3A1.5 1.5 0 0110 3.5V5H4V3.5z" fill="currentColor"/></svg>
            <span><?php esc_html_e('Transfers', 'transfers-booking'); ?></span>
        </button>
        <button type="button" class="tb-search-widget__tab" data-service="hourly">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5A5.5 5.5 0 1113.5 8 5.51 5.51 0 018 13.5zM8.5 4H7v5l4.25 2.55.75-1.23-3.5-2.07V4z" fill="currentColor"/></svg>
            <span><?php esc_html_e('By the Hour', 'transfers-booking'); ?></span>
        </button>
        <button type="button" class="tb-search-widget__tab" data-service="trips">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 118 4.5a1.75 1.75 0 010 3.5z" fill="currentColor"/></svg>
            <span><?php esc_html_e('Day Trips', 'transfers-booking'); ?></span>
        </button>
    </div>
    <?php endif; ?>

    <?php if ($headline) : ?>
    <h2 class="tb-search-widget__headline"><?php echo esc_html($headline); ?></h2>
    <?php endif; ?>

    <!-- TRANSFERS FORM -->
    <div class="tb-search-widget__form tb-search-widget__form--active" data-service="transfers">
        <div class="tb-search-widget__bar">
            <!-- From -->
            <div class="tb-search-widget__field tb-search-widget__field--from <?php echo $fixed_origin ? 'tb-search-widget__field--locked' : ''; ?>">
                <div class="tb-search-widget__field-icon tb-search-widget__field-icon--from">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('From', 'transfers-booking'); ?></label>
                    <input type="text" class="tb-search-widget__input" data-field="from" placeholder="<?php esc_attr_e('Airport, hotel, address...', 'transfers-booking'); ?>" autocomplete="off"<?php if ($fixed_origin) : ?> value="<?php echo esc_attr($fixed_origin); ?>" readonly<?php endif; ?>>
                    <input type="hidden" data-field="from_lat"<?php if ($fixed_origin_lat) echo ' value="' . esc_attr($fixed_origin_lat) . '"'; ?>>
                    <input type="hidden" data-field="from_lng"<?php if ($fixed_origin_lng) echo ' value="' . esc_attr($fixed_origin_lng) . '"'; ?>>
                    <input type="hidden" data-field="from_address"<?php if ($fixed_origin) echo ' value="' . esc_attr($fixed_origin) . '"'; ?>>
                </div>
                <?php if (!$fixed_origin) : ?>
                <div class="tb-search-widget__autocomplete" data-for="from"></div>
                <?php endif; ?>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- To -->
            <div class="tb-search-widget__field tb-search-widget__field--to">
                <div class="tb-search-widget__field-icon tb-search-widget__field-icon--to">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 118 4.5a1.75 1.75 0 010 3.5z" fill="currentColor"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('To', 'transfers-booking'); ?></label>
                    <input type="text" class="tb-search-widget__input" data-field="to" placeholder="<?php esc_attr_e('Airport, hotel, address...', 'transfers-booking'); ?>" autocomplete="off">
                    <input type="hidden" data-field="to_lat">
                    <input type="hidden" data-field="to_lng">
                    <input type="hidden" data-field="to_address">
                </div>
                <div class="tb-search-widget__autocomplete" data-for="to"></div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Date -->
            <div class="tb-search-widget__field tb-search-widget__field--date">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 1v2M11 1v2M2 6h12M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Date', 'transfers-booking'); ?></label>
                    <input type="datetime-local" class="tb-search-widget__input" data-field="date">
                </div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Return Date Toggle -->
            <div class="tb-search-widget__field tb-search-widget__field--return">
                <div class="tb-search-widget__return-toggle">
                    <button type="button" class="tb-search-widget__add-return" data-action="add-return">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                        <?php esc_html_e('Add return', 'transfers-booking'); ?>
                    </button>
                </div>
                <div class="tb-search-widget__return-date" style="display:none">
                    <div class="tb-search-widget__field-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 1v2M11 1v2M2 6h12M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="tb-search-widget__field-content">
                        <label class="tb-search-widget__field-label"><?php esc_html_e('Return', 'transfers-booking'); ?></label>
                        <input type="datetime-local" class="tb-search-widget__input" data-field="return_date">
                    </div>
                    <button type="button" class="tb-search-widget__remove-return" data-action="remove-return">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                </div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Passengers -->
            <div class="tb-search-widget__field tb-search-widget__field--passengers">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-2.21 2.69-4 6-4s6 1.79 6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Passengers', 'transfers-booking'); ?></label>
                    <button type="button" class="tb-search-widget__counter-btn" data-dropdown="passengers">
                        <span data-display="passengers"><?php esc_html_e('2 Adults', 'transfers-booking'); ?></span>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div class="tb-search-widget__dropdown" data-dropdown-panel="passengers">
                    <div class="tb-search-widget__dropdown-row">
                        <span class="tb-search-widget__dropdown-label"><?php esc_html_e('Adults', 'transfers-booking'); ?></span>
                        <div class="tb-search-widget__stepper">
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="decrement" data-target="adults">-</button>
                            <span class="tb-search-widget__stepper-value" data-value="adults">2</span>
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="increment" data-target="adults">+</button>
                        </div>
                    </div>
                    <div class="tb-search-widget__dropdown-row">
                        <span class="tb-search-widget__dropdown-label"><?php esc_html_e('Children', 'transfers-booking'); ?></span>
                        <div class="tb-search-widget__stepper">
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="decrement" data-target="children">-</button>
                            <span class="tb-search-widget__stepper-value" data-value="children">0</span>
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="increment" data-target="children">+</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Luggage -->
            <div class="tb-search-widget__field tb-search-widget__field--luggage">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 4V2.5A1.5 1.5 0 016.5 1h3A1.5 1.5 0 0111 2.5V4M2 5h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Luggage', 'transfers-booking'); ?></label>
                    <button type="button" class="tb-search-widget__counter-btn" data-dropdown="luggage">
                        <span data-display="luggage"><?php esc_html_e('2 Bags', 'transfers-booking'); ?></span>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div class="tb-search-widget__dropdown" data-dropdown-panel="luggage">
                    <div class="tb-search-widget__dropdown-row">
                        <span class="tb-search-widget__dropdown-label"><?php esc_html_e('Checked bags', 'transfers-booking'); ?></span>
                        <div class="tb-search-widget__stepper">
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="decrement" data-target="checked_bags">-</button>
                            <span class="tb-search-widget__stepper-value" data-value="checked_bags">2</span>
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="increment" data-target="checked_bags">+</button>
                        </div>
                    </div>
                    <div class="tb-search-widget__dropdown-row">
                        <span class="tb-search-widget__dropdown-label"><?php esc_html_e('Hand luggage', 'transfers-booking'); ?></span>
                        <div class="tb-search-widget__stepper">
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="decrement" data-target="hand_luggage">-</button>
                            <span class="tb-search-widget__stepper-value" data-value="hand_luggage">0</span>
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="increment" data-target="hand_luggage">+</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Search Button -->
            <button type="button" class="tb-search-widget__search-btn" data-action="search">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span><?php esc_html_e('Search', 'transfers-booking'); ?></span>
            </button>
        </div>
    </div>

    <!-- BY THE HOUR FORM -->
    <div class="tb-search-widget__form" data-service="hourly">
        <div class="tb-search-widget__bar">
            <!-- City -->
            <div class="tb-search-widget__field tb-search-widget__field--from">
                <div class="tb-search-widget__field-icon tb-search-widget__field-icon--from">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('City', 'transfers-booking'); ?></label>
                    <input type="text" class="tb-search-widget__input" data-field="hourly_city" placeholder="<?php esc_attr_e('Select a city...', 'transfers-booking'); ?>" autocomplete="off">
                    <input type="hidden" data-field="hourly_city_lat">
                    <input type="hidden" data-field="hourly_city_lng">
                    <input type="hidden" data-field="hourly_city_address">
                </div>
                <div class="tb-search-widget__autocomplete" data-for="hourly_city"></div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Date -->
            <div class="tb-search-widget__field tb-search-widget__field--date">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 1v2M11 1v2M2 6h12M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Date', 'transfers-booking'); ?></label>
                    <input type="datetime-local" class="tb-search-widget__input" data-field="hourly_date">
                </div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Hours -->
            <div class="tb-search-widget__field tb-search-widget__field--hours">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5A5.5 5.5 0 1113.5 8 5.51 5.51 0 018 13.5zM8.5 4H7v5l4.25 2.55.75-1.23-3.5-2.07V4z" fill="currentColor"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Hours', 'transfers-booking'); ?></label>
                    <select class="tb-search-widget__input tb-search-widget__select" data-field="hourly_hours">
                        <?php for ($i = 2; $i <= 12; $i++) : ?>
                        <option value="<?php echo $i; ?>"><?php echo $i; ?> <?php esc_html_e('hours', 'transfers-booking'); ?></option>
                        <?php endfor; ?>
                    </select>
                </div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Passengers -->
            <div class="tb-search-widget__field tb-search-widget__field--passengers">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-2.21 2.69-4 6-4s6 1.79 6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Passengers', 'transfers-booking'); ?></label>
                    <button type="button" class="tb-search-widget__counter-btn" data-dropdown="hourly_passengers">
                        <span data-display="hourly_passengers"><?php esc_html_e('2 Adults', 'transfers-booking'); ?></span>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div class="tb-search-widget__dropdown" data-dropdown-panel="hourly_passengers">
                    <div class="tb-search-widget__dropdown-row">
                        <span class="tb-search-widget__dropdown-label"><?php esc_html_e('Adults', 'transfers-booking'); ?></span>
                        <div class="tb-search-widget__stepper">
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="decrement" data-target="hourly_adults">-</button>
                            <span class="tb-search-widget__stepper-value" data-value="hourly_adults">2</span>
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="increment" data-target="hourly_adults">+</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Search Button -->
            <button type="button" class="tb-search-widget__search-btn" data-action="search">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span><?php esc_html_e('Search', 'transfers-booking'); ?></span>
            </button>
        </div>
    </div>

    <!-- DAY TRIPS FORM -->
    <div class="tb-search-widget__form" data-service="trips">
        <div class="tb-search-widget__bar">
            <!-- Departure City -->
            <div class="tb-search-widget__field tb-search-widget__field--from">
                <div class="tb-search-widget__field-icon tb-search-widget__field-icon--from">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Departure City', 'transfers-booking'); ?></label>
                    <input type="text" class="tb-search-widget__input" data-field="trips_departure" placeholder="<?php esc_attr_e('Select a city...', 'transfers-booking'); ?>" autocomplete="off">
                    <input type="hidden" data-field="trips_departure_lat">
                    <input type="hidden" data-field="trips_departure_lng">
                    <input type="hidden" data-field="trips_departure_address">
                </div>
                <div class="tb-search-widget__autocomplete" data-for="trips_departure"></div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Date -->
            <div class="tb-search-widget__field tb-search-widget__field--date">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 1v2M11 1v2M2 6h12M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Date', 'transfers-booking'); ?></label>
                    <input type="date" class="tb-search-widget__input" data-field="trips_date">
                </div>
            </div>

            <div class="tb-search-widget__divider"></div>

            <!-- Participants -->
            <div class="tb-search-widget__field tb-search-widget__field--passengers">
                <div class="tb-search-widget__field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-2.21 2.69-4 6-4s6 1.79 6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </div>
                <div class="tb-search-widget__field-content">
                    <label class="tb-search-widget__field-label"><?php esc_html_e('Participants', 'transfers-booking'); ?></label>
                    <button type="button" class="tb-search-widget__counter-btn" data-dropdown="trips_participants">
                        <span data-display="trips_participants"><?php esc_html_e('2 Adults', 'transfers-booking'); ?></span>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div class="tb-search-widget__dropdown" data-dropdown-panel="trips_participants">
                    <div class="tb-search-widget__dropdown-row">
                        <span class="tb-search-widget__dropdown-label"><?php esc_html_e('Adults', 'transfers-booking'); ?></span>
                        <div class="tb-search-widget__stepper">
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="decrement" data-target="trips_adults">-</button>
                            <span class="tb-search-widget__stepper-value" data-value="trips_adults">2</span>
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="increment" data-target="trips_adults">+</button>
                        </div>
                    </div>
                    <div class="tb-search-widget__dropdown-row">
                        <span class="tb-search-widget__dropdown-label"><?php esc_html_e('Children', 'transfers-booking'); ?></span>
                        <div class="tb-search-widget__stepper">
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="decrement" data-target="trips_children">-</button>
                            <span class="tb-search-widget__stepper-value" data-value="trips_children">0</span>
                            <button type="button" class="tb-search-widget__stepper-btn" data-action="increment" data-target="trips_children">+</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Search Button -->
            <button type="button" class="tb-search-widget__search-btn" data-action="search">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span><?php esc_html_e('Search', 'transfers-booking'); ?></span>
            </button>
        </div>
    </div>

    <?php if ($show_badges) : ?>
    <div class="tb-search-widget__badges">
        <span class="tb-search-widget__badge tb-search-widget__badge--cancel">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <?php esc_html_e('Free cancellation 24h', 'transfers-booking'); ?>
        </span>
        <span class="tb-search-widget__badge tb-search-widget__badge--rating">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.85.67-3.93L1.3 5.14l3.94-.57L7 1z" fill="currentColor"/></svg>
            <?php esc_html_e('4.9/5 Google', 'transfers-booking'); ?>
        </span>
        <span class="tb-search-widget__badge tb-search-widget__badge--secure">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3.5v3.5c0 3.15 2.14 6.1 5 7 2.86-.9 5-3.85 5-7V3.5L7 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
            <?php esc_html_e('Secure payment', 'transfers-booking'); ?>
        </span>
    </div>
    <?php endif; ?>

</div>
