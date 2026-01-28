from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'payments'

router = DefaultRouter()
router.register('gateways', views.PaymentGatewayViewSet, basename='gateway')
router.register('invoices', views.InvoiceViewSet, basename='invoice')
router.register('', views.PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/stripe/', views.StripeWebhookView.as_view(), name='stripe_webhook'),
    path('webhooks/paypal/', views.PayPalWebhookView.as_view(), name='paypal_webhook'),
]
