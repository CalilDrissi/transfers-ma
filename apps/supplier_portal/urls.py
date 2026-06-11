from django.urls import path
from . import views

app_name = 'supplier'

urlpatterns = [
    path('login/', views.supplier_login, name='login'),
    path('logout/', views.supplier_logout, name='logout'),
    path('', views.home, name='home'),

    # Vehicles
    path('vehicles/', views.vehicle_list, name='vehicle_list'),
    path('vehicles/create/', views.vehicle_create, name='vehicle_create'),
    path('vehicles/<int:pk>/', views.vehicle_detail, name='vehicle_detail'),

    # Zones
    path('zones/', views.zone_list, name='zone_list'),
    path('zones/create/', views.zone_create, name='zone_create'),
    path('zones/<int:pk>/', views.zone_detail, name='zone_detail'),

    # Routes
    path('routes/', views.route_list, name='route_list'),
    path('routes/create/', views.route_create, name='route_create'),
    path('routes/<int:pk>/', views.route_detail, name='route_detail'),

    # Bookings
    path('bookings/', views.booking_list, name='booking_list'),
    path('bookings/<int:pk>/', views.booking_detail, name='booking_detail'),

    # Earnings
    path('earnings/', views.earnings, name='earnings'),

    # Account
    path('account/', views.account, name='account'),
]
