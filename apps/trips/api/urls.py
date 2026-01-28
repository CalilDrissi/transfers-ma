from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'trips'

router = DefaultRouter()
router.register('bookings', views.TripBookingViewSet, basename='booking')
router.register('', views.TripViewSet, basename='trip')

urlpatterns = [
    path('', include(router.urls)),
]
