from modeltranslation.translator import translator, TranslationOptions
from .models import Trip


class TripTranslationOptions(TranslationOptions):
    fields = ('name', 'description', 'short_description', 'inclusions', 'exclusions', 'itinerary')


translator.register(Trip, TripTranslationOptions)
