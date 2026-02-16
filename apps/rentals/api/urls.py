from django.urls import path, include

app_name = 'rentals'

urlpatterns = [
    path('', include('apps.rental_companies.api.urls')),
]
