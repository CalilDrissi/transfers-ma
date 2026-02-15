from django.utils import translation


class LanguageMiddleware:
    """
    Activate Django translation based on the Accept-Language header.
    Works with django.middleware.locale.LocaleMiddleware — this middleware
    runs after it and overrides for API requests that send an explicit
    Accept-Language (e.g. from the WordPress plugin).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        if accept_lang:
            # Take the primary language tag (e.g. "fr" from "fr,en;q=0.9")
            lang_code = accept_lang.split(',')[0].split(';')[0].strip()
            if lang_code:
                translation.activate(lang_code)
                request.LANGUAGE_CODE = translation.get_language()

        response = self.get_response(request)
        return response
