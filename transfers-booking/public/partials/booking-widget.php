<?php defined('ABSPATH') || exit; ?>

<div id="tb-booking-widget" class="tb-booking-widget" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">

    <!-- Multi-city progress indicator -->
    <div id="tb-multi-progress"></div>

    <!-- Progress Bar -->
    <div class="tb-progress">
        <div class="tb-progress__step tb-progress__step--active" data-step="1">
            <span class="tb-progress__number">1</span>
            <span class="tb-progress__label"><?php esc_html_e('Route', 'transfers-booking'); ?></span>
        </div>
        <div class="tb-progress__connector"></div>
        <div class="tb-progress__step" data-step="2">
            <span class="tb-progress__number">2</span>
            <span class="tb-progress__label"><?php esc_html_e('Vehicle', 'transfers-booking'); ?></span>
        </div>
        <div class="tb-progress__connector"></div>
        <div class="tb-progress__step" data-step="3">
            <span class="tb-progress__number">3</span>
            <span class="tb-progress__label"><?php esc_html_e('Payment', 'transfers-booking'); ?></span>
        </div>
    </div>

    <!-- Step 1: Route -->
    <div id="tb-step-1" class="tb-step tb-step--active">
        <?php include TB_PLUGIN_DIR . 'public/partials/step-1.php'; ?>
    </div>

    <!-- Step 2: Vehicle -->
    <div id="tb-step-2" class="tb-step">
        <?php include TB_PLUGIN_DIR . 'public/partials/step-2.php'; ?>
    </div>

    <!-- Step 3: Payment -->
    <div id="tb-step-3" class="tb-step">
        <?php include TB_PLUGIN_DIR . 'public/partials/step-3.php'; ?>
    </div>

    <!-- Confirmation -->
    <div id="tb-confirmation" class="tb-step">
        <?php include TB_PLUGIN_DIR . 'public/partials/confirmation.php'; ?>
    </div>
</div>
