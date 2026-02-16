from django.urls import path
from . import views

app_name = 'portal'

urlpatterns = [
    path('login/', views.portal_login, name='login'),
    path('logout/', views.portal_logout, name='logout'),
    path('', views.portal_home, name='home'),
    path('vehicles/', views.vehicle_list, name='vehicle_list'),
    path('vehicles/create/', views.vehicle_create, name='vehicle_create'),
    path('vehicles/<int:pk>/', views.vehicle_detail, name='vehicle_detail'),
    path('vehicles/<int:pk>/calendar/', views.vehicle_calendar, name='vehicle_calendar'),
    path('bookings/', views.booking_list, name='booking_list'),
    path('bookings/<int:pk>/', views.booking_detail, name='booking_detail'),
    path('earnings/', views.earnings, name='earnings'),
    path('reviews/', views.reviews, name='reviews'),
    path('profile/', views.profile, name='profile'),
    path('documents/', views.documents, name='documents'),
]
