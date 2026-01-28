from modeltranslation.translator import translator, TranslationOptions
from .models import VehicleCategory, VehicleFeature


class VehicleCategoryTranslationOptions(TranslationOptions):
    fields = ('name', 'description')


class VehicleFeatureTranslationOptions(TranslationOptions):
    fields = ('name',)


translator.register(VehicleCategory, VehicleCategoryTranslationOptions)
translator.register(VehicleFeature, VehicleFeatureTranslationOptions)
