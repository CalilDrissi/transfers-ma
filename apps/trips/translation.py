from modeltranslation.translator import translator, TranslationOptions
from .models import (
    Trip, TripHighlight, TripItineraryStop, TripPriceTier,
    TripContentBlock, TripFAQ, TripImage,
)


class TripTranslationOptions(TranslationOptions):
    fields = (
        'name', 'description', 'short_description',
        'departure_location', 'destinations',
        'inclusions', 'exclusions', 'itinerary',
        'child_policy', 'accessibility_info',
        'meta_title', 'meta_description',
    )


class TripHighlightTranslationOptions(TranslationOptions):
    fields = ('text',)


class TripItineraryStopTranslationOptions(TranslationOptions):
    fields = ('name', 'location', 'description')


class TripPriceTierTranslationOptions(TranslationOptions):
    fields = ('name',)


class TripContentBlockTranslationOptions(TranslationOptions):
    fields = ('title', 'content')


class TripFAQTranslationOptions(TranslationOptions):
    fields = ('question', 'answer')


class TripImageTranslationOptions(TranslationOptions):
    fields = ('caption', 'alt_text')


translator.register(Trip, TripTranslationOptions)
translator.register(TripHighlight, TripHighlightTranslationOptions)
translator.register(TripItineraryStop, TripItineraryStopTranslationOptions)
translator.register(TripPriceTier, TripPriceTierTranslationOptions)
translator.register(TripContentBlock, TripContentBlockTranslationOptions)
translator.register(TripFAQ, TripFAQTranslationOptions)
translator.register(TripImage, TripImageTranslationOptions)
