from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.transfers.api.search import UnifiedSearchView

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1
    path('api/v1/auth/', include('apps.accounts.api.urls')),
    path('api/v1/locations/', include('apps.locations.api.urls')),
    path('api/v1/vehicles/', include('apps.vehicles.api.urls')),
    path('api/v1/transfers/', include('apps.transfers.api.urls')),
    path('api/v1/trips/', include('apps.trips.api.urls')),
    path('api/v1/rentals/', include('apps.rentals.api.urls')),
    path('api/v1/payments/', include('apps.payments.api.urls')),

    # Unified Search
    path('api/v1/dashboard-search/', UnifiedSearchView.as_view(), name='unified_search'),

    # Language switching
    path('i18n/', include('django.conf.urls.i18n')),
]

# Dashboard URLs with i18n
urlpatterns += i18n_patterns(
    path('dashboard/', include('apps.dashboard.urls')),
    prefix_default_language=False,
)

# Debug toolbar
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
