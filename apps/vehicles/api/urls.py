from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'vehicles'

router = DefaultRouter()
router.register('categories', views.VehicleCategoryViewSet, basename='category')
router.register('features', views.VehicleFeatureViewSet, basename='feature')
router.register('', views.VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('', include(router.urls)),
]
