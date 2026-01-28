from modeltranslation.translator import translator, TranslationOptions
from .models import Zone


class ZoneTranslationOptions(TranslationOptions):
    fields = ('name', 'description')


translator.register(Zone, ZoneTranslationOptions)
