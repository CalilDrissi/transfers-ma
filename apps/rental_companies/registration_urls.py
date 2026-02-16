from django.urls import path
from .registration_views import register

urlpatterns = [
    path('', register, name='rental_company_register'),
]
