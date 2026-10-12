from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:token>/', views.confirm_reception, name='supplier_confirm'),
]
