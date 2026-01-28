from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'rentals'

router = DefaultRouter()
router.register('extras', views.RentalExtraViewSet, basename='extra')
router.register('insurance', views.InsuranceOptionViewSet, basename='insurance')
router.register('', views.RentalViewSet, basename='rental')

urlpatterns = [
    path('', include(router.urls)),
]
