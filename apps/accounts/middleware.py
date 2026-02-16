from django.conf import settings
from django.utils import translation


# Build a set of valid language codes from settings.LANGUAGES
_VALID_LANGS = {code for code, _name in settings.LANGUAGES}


class LanguageMiddleware:
    """
    Activate Django translation based on the Accept-Language header.
    Only applies to API requests (not dashboard i18n_patterns URLs).
    Validates against LANGUAGES to avoid breaking i18n_patterns resolution.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip dashboard URLs — let LocaleMiddleware handle i18n_patterns
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        if accept_lang:
            # Take the primary language tag (e.g. "fr" from "fr,en;q=0.9")
            lang_code = accept_lang.split(',')[0].split(';')[0].strip().lower()
            # Normalize "en-US" → "en", "pt-BR" → "pt"
            base_lang = lang_code.split('-')[0]
            if base_lang in _VALID_LANGS:
                translation.activate(base_lang)
                request.LANGUAGE_CODE = base_lang

        response = self.get_response(request)
        return response
