from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # Auth
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    # Home
    path('', views.home, name='home'),

    # Transfers
    path('transfers/', views.transfer_list, name='transfer_list'),
    path('transfers/<int:pk>/', views.transfer_detail, name='transfer_detail'),

    # Trips/Tours
    path('trips/', views.trip_list, name='trip_list'),
    path('trips/create/', views.trip_create, name='trip_create'),
    path('trips/<int:pk>/preview/', views.trip_preview, name='trip_preview'),
    path('trips/<int:pk>/', views.trip_detail, name='trip_detail'),
    path('trips/bookings/', views.trip_booking_list, name='trip_booking_list'),

    # Transfer Vehicles
    path('transfer-vehicles/', views.transfer_vehicle_list, name='transfer_vehicle_list'),
    path('transfer-vehicles/create/', views.vehicle_create, {'service_type': 'transfer'}, name='transfer_vehicle_create'),
    path('transfer-vehicles/<int:pk>/', views.vehicle_detail, name='transfer_vehicle_detail'),

    # Vehicle Categories
    path('vehicle-categories/', views.vehicle_category_list, name='vehicle_category_list'),
    path('vehicle-categories/create/', views.vehicle_category_create, name='vehicle_category_create'),
    path('vehicle-categories/<int:pk>/', views.vehicle_category_detail, name='vehicle_category_detail'),

    # Zones
    path('zones/', views.zone_list, name='zone_list'),
    path('zones/create/', views.zone_create, name='zone_create'),
    path('zones/<int:pk>/', views.zone_detail, name='zone_detail'),

    # Routes
    path('routes/', views.route_list, name='route_list'),
    path('routes/create/', views.route_create, name='route_create'),
    path('routes/<int:pk>/', views.route_detail, name='route_detail'),

    # Users
    path('users/', views.user_list, name='user_list'),

    # Payments
    path('payments/', views.payment_list, name='payment_list'),

    # Reports
    path('reports/', views.reports, name='reports'),

    # Settings
    path('settings/', views.settings_view, name='settings'),

    # API Keys
    path('api-keys/', views.api_key_list, name='api_key_list'),
    path('api-keys/<int:pk>/', views.api_key_detail, name='api_key_detail'),

    # Coupons
    path('coupons/', views.coupon_list, name='coupon_list'),
    path('coupons/create/', views.coupon_create, name='coupon_create'),
    path('coupons/<int:pk>/', views.coupon_detail, name='coupon_detail'),

    # Rental Companies
    path('rental-companies/', views.rental_company_list, name='rental_company_list'),
    path('rental-companies/<int:pk>/', views.rental_company_detail, name='rental_company_detail'),

    # Payouts
    path('payouts/', views.payout_list, name='payout_list'),

    # Rentals
    path('rentals/', views.rental_list, name='rental_list'),
    path('rentals/<int:pk>/', views.rental_detail_view, name='rental_detail'),
]
