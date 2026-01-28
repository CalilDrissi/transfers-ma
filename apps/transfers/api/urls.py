from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'transfers'

router = DefaultRouter()
router.register('extras', views.TransferExtraViewSet, basename='extra')
router.register('', views.TransferViewSet, basename='transfer')

urlpatterns = [
    path('', include(router.urls)),
]
