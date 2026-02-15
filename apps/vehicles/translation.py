from modeltranslation.translator import translator, TranslationOptions
from .models import VehicleCategory, VehicleFeature, Vehicle, VehicleImage


class VehicleCategoryTranslationOptions(TranslationOptions):
    fields = ('name', 'description', 'tagline')


class VehicleFeatureTranslationOptions(TranslationOptions):
    fields = ('name',)


class VehicleTranslationOptions(TranslationOptions):
    fields = ('name', 'client_description', 'important_note')


class VehicleImageTranslationOptions(TranslationOptions):
    fields = ('caption',)


translator.register(VehicleCategory, VehicleCategoryTranslationOptions)
translator.register(VehicleFeature, VehicleFeatureTranslationOptions)
translator.register(Vehicle, VehicleTranslationOptions)
translator.register(VehicleImage, VehicleImageTranslationOptions)
