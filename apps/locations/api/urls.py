from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'locations'

router = DefaultRouter()
router.register('zones', views.ZoneViewSet, basename='zone')
router.register('zone-pricing', views.ZonePricingViewSet, basename='zone-pricing')
router.register('routes', views.RouteViewSet, basename='route')

urlpatterns = [
    path('calculate-distance/', views.calculate_distance_view, name='calculate-distance'),
    path('google-maps-config/', views.google_maps_config, name='google-maps-config'),
    path('', include(router.urls)),
]
