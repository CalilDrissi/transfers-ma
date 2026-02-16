from django.urls import path

from .views import (
    InsuranceOptionListView,
    RentalByRefView,
    RentalCitiesView,
    RentalCompanyProfileView,
    RentalCreateView,
    RentalExtraListView,
    RentalSearchView,
)

app_name = 'rental_companies_api'

urlpatterns = [
    path('search/', RentalSearchView.as_view(), name='search'),
    path('cities/', RentalCitiesView.as_view(), name='cities'),
    path('companies/<slug:slug>/', RentalCompanyProfileView.as_view(), name='company-profile'),
    path('', RentalCreateView.as_view(), name='create'),
    path('by-ref/<str:ref>/', RentalByRefView.as_view(), name='by-ref'),
    path('insurance/', InsuranceOptionListView.as_view(), name='insurance-list'),
    path('extras/', RentalExtraListView.as_view(), name='extras-list'),
]
