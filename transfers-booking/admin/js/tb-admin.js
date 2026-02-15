(function ($) {
    'use strict';

    $(document).ready(function () {
        $('#tb-test-connection').on('click', function () {
            var $btn = $(this);
            var $result = $('#tb-test-result');

            $btn.prop('disabled', true);
            $result.text(tbAdmin.i18n.testing).css('color', '#666');

            $.post(tbAdmin.ajaxUrl, {
                action: 'tb_test_connection',
                nonce: tbAdmin.nonce
            }, function (response) {
                if (response.success) {
                    $result.text(response.data.message).css('color', '#00a32a');
                } else {
                    $result.text(response.data.message || tbAdmin.i18n.failed).css('color', '#d63638');
                }
            }).fail(function () {
                $result.text(tbAdmin.i18n.failed).css('color', '#d63638');
            }).always(function () {
                $btn.prop('disabled', false);
            });
        });
    });
})(jQuery);
