from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .search import TransferByRefView

app_name = 'transfers'

router = DefaultRouter()
router.register('extras', views.TransferExtraViewSet, basename='extra')
router.register('', views.TransferViewSet, basename='transfer')

urlpatterns = [
    path('by-ref/<str:ref>/', TransferByRefView.as_view(), name='transfer_by_ref'),
    path('', include(router.urls)),
]
