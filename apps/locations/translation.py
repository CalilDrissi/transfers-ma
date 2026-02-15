from modeltranslation.translator import translator, TranslationOptions
from .models import Zone, Route, RoutePickupZone, RouteDropoffZone


class ZoneTranslationOptions(TranslationOptions):
    fields = ('name', 'description')


class RouteTranslationOptions(TranslationOptions):
    fields = ('name', 'description', 'origin_name', 'destination_name')


class RoutePickupZoneTranslationOptions(TranslationOptions):
    fields = ('name',)


class RouteDropoffZoneTranslationOptions(TranslationOptions):
    fields = ('name',)


translator.register(Zone, ZoneTranslationOptions)
translator.register(Route, RouteTranslationOptions)
translator.register(RoutePickupZone, RoutePickupZoneTranslationOptions)
translator.register(RouteDropoffZone, RouteDropoffZoneTranslationOptions)
