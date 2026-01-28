from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse

from apps.payments.models import PaymentGateway, Payment, Refund, Invoice
from apps.payments.gateways import get_gateway
from .serializers import (
    PaymentGatewaySerializer,
    PaymentSerializer,
    PaymentListSerializer,
    CreatePaymentSerializer,
    ConfirmPaymentSerializer,
    RefundSerializer,
    CreateRefundSerializer,
    InvoiceSerializer
)


class PaymentGatewayViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for listing available payment gateways."""
    queryset = PaymentGateway.objects.filter(is_active=True)
    serializer_class = PaymentGatewaySerializer
    permission_classes = [permissions.AllowAny]


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payments."""
    queryset = Payment.objects.select_related('gateway', 'customer')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_type', 'gateway']
    search_fields = ['payment_ref', 'customer_email', 'gateway_payment_id']
    ordering_fields = ['created_at', 'amount']

    def get_permissions(self):
        if self.action in ['create', 'confirm']:
            return [permissions.AllowAny()]
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentListSerializer
        if self.action == 'create':
            return CreatePaymentSerializer
        if self.action == 'confirm':
            return ConfirmPaymentSerializer
        return PaymentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related('gateway', 'customer')

        if user.is_staff:
            return queryset
        if user.is_authenticated:
            return queryset.filter(customer=user)
        return queryset.none()

    def create(self, request):
        """Create a new payment."""
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get the booking
        booking_type = data['booking_type']
        booking_id = data['booking_id']

        if booking_type == 'transfer':
            from apps.transfers.models import Transfer
            booking = Transfer.objects.get(id=booking_id)
            payment_type = Payment.PaymentType.TRANSFER
        elif booking_type == 'trip':
            from apps.trips.models import TripBooking
            booking = TripBooking.objects.get(id=booking_id)
            payment_type = Payment.PaymentType.TRIP
        elif booking_type == 'rental':
            from apps.rentals.models import Rental
            booking = Rental.objects.get(id=booking_id)
            payment_type = Payment.PaymentType.RENTAL

        # Get gateway
        gateway_type = data['gateway_type']
        gateway_db = PaymentGateway.objects.get(
            gateway_type=gateway_type,
            is_active=True
        )
        gateway = get_gateway(gateway_type)

        # Create payment in database
        content_type = ContentType.objects.get_for_model(booking)
        payment = Payment.objects.create(
            content_type=content_type,
            object_id=booking.id,
            payment_type=payment_type,
            customer=request.user if request.user.is_authenticated else None,
            customer_email=booking.customer_email,
            gateway=gateway_db,
            amount=booking.total_price,
            currency=booking.currency,
            metadata={
                'booking_ref': booking.booking_ref,
                'booking_type': booking_type,
            }
        )

        # Create payment with gateway
        description = f"Payment for {booking.booking_ref}"
        result = gateway.create_payment(
            amount=payment.amount,
            currency=payment.currency,
            metadata={
                'payment_ref': payment.payment_ref,
                'booking_ref': booking.booking_ref,
            },
            customer_email=payment.customer_email,
            description=description,
            return_url=data.get('return_url'),
            cancel_url=data.get('cancel_url'),
        )

        if result.success:
            payment.gateway_payment_id = result.payment_id
            payment.status = Payment.Status.PROCESSING
            payment.save()

            return Response({
                'payment_ref': payment.payment_ref,
                'gateway_payment_id': result.payment_id,
                'client_secret': result.client_secret,
                'redirect_url': result.redirect_url,
                'status': payment.status,
            }, status=status.HTTP_201_CREATED)
        else:
            payment.status = Payment.Status.FAILED
            payment.error_message = result.error_message
            payment.save()

            return Response({
                'error': result.error_message
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def confirm(self, request):
        """Confirm a payment after client-side completion."""
        serializer = ConfirmPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment = Payment.objects.get(payment_ref=data['payment_ref'])
        gateway = get_gateway(payment.gateway.gateway_type)

        # For PayPal, pass payer_id
        if payment.gateway.gateway_type == 'paypal':
            result = gateway.confirm_payment(
                payment.gateway_payment_id,
                payer_id=data.get('payer_id')
            )
        else:
            result = gateway.confirm_payment(payment.gateway_payment_id)

        if result.success and result.status in ['succeeded', 'approved']:
            payment.status = Payment.Status.COMPLETED
            payment.completed_at = timezone.now()
            payment.save()

            # Update booking status
            self._update_booking_status(payment, 'confirmed')

            return Response(PaymentSerializer(payment).data)
        else:
            return Response({
                'error': result.error_message or 'Payment confirmation failed',
                'status': result.status
            }, status=status.HTTP_400_BAD_REQUEST)

    def _update_booking_status(self, payment, new_status):
        """Update the associated booking status."""
        if payment.payment_type == Payment.PaymentType.TRANSFER:
            from apps.transfers.models import Transfer
            booking = Transfer.objects.get(id=payment.object_id)
            booking.status = new_status
            booking.save()
        elif payment.payment_type == Payment.PaymentType.TRIP:
            from apps.trips.models import TripBooking
            booking = TripBooking.objects.get(id=payment.object_id)
            booking.status = new_status
            booking.save()
        elif payment.payment_type == Payment.PaymentType.RENTAL:
            from apps.rentals.models import Rental
            booking = Rental.objects.get(id=payment.object_id)
            booking.status = new_status
            booking.save()

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Create a refund for a payment."""
        payment = self.get_object()

        if not payment.can_refund:
            return Response(
                {'error': 'This payment cannot be refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CreateRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        amount = data.get('amount')
        reason = data.get('reason', '')

        gateway = get_gateway(payment.gateway.gateway_type)
        result = gateway.refund(
            payment.gateway_payment_id,
            amount=amount,
            reason=reason
        )

        if result.success:
            refund_amount = amount or payment.amount
            refund = Refund.objects.create(
                payment=payment,
                amount=refund_amount,
                reason=reason,
                gateway_refund_id=result.refund_id,
                status=Refund.Status.COMPLETED,
                completed_at=timezone.now(),
                processed_by=request.user if request.user.is_authenticated else None
            )

            payment.refunded_amount += refund_amount
            if payment.refunded_amount >= payment.amount:
                payment.status = Payment.Status.REFUNDED
            else:
                payment.status = Payment.Status.PARTIALLY_REFUNDED
            payment.save()

            return Response(RefundSerializer(refund).data)
        else:
            return Response(
                {'error': result.error_message},
                status=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """Handle Stripe webhooks."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        signature = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            gateway = get_gateway('stripe')
            event_data = gateway.verify_webhook(payload, signature)

            event_type = event_data['event_type']
            data = event_data['data']

            if event_type == 'payment_intent.succeeded':
                payment_id = data.get('id')
                payment = Payment.objects.filter(
                    gateway_payment_id=payment_id
                ).first()
                if payment:
                    payment.status = Payment.Status.COMPLETED
                    payment.completed_at = timezone.now()
                    payment.save()

            elif event_type == 'payment_intent.payment_failed':
                payment_id = data.get('id')
                payment = Payment.objects.filter(
                    gateway_payment_id=payment_id
                ).first()
                if payment:
                    payment.status = Payment.Status.FAILED
                    payment.error_message = data.get('last_payment_error', {}).get('message', '')
                    payment.save()

            return HttpResponse(status=200)

        except ValueError as e:
            return HttpResponse(str(e), status=400)


@method_decorator(csrf_exempt, name='dispatch')
class PayPalWebhookView(APIView):
    """Handle PayPal webhooks."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        signature = request.META.get('HTTP_PAYPAL_TRANSMISSION_SIG', '')

        try:
            gateway = get_gateway('paypal')
            event_data = gateway.verify_webhook(payload, signature)

            event_type = event_data['event_type']
            data = event_data['data']

            if event_type == 'PAYMENT.SALE.COMPLETED':
                payment_id = data.get('parent_payment')
                payment = Payment.objects.filter(
                    gateway_payment_id=payment_id
                ).first()
                if payment:
                    payment.status = Payment.Status.COMPLETED
                    payment.completed_at = timezone.now()
                    payment.save()

            return HttpResponse(status=200)

        except ValueError as e:
            return HttpResponse(str(e), status=400)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for invoices."""
    queryset = Invoice.objects.select_related('payment')
    serializer_class = InvoiceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['issue_date', 'created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        user = self.request.user
        queryset = Invoice.objects.select_related('payment')

        if user.is_staff:
            return queryset
        if user.is_authenticated:
            return queryset.filter(payment__customer=user)
        return queryset.none()
