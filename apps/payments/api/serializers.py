from rest_framework import serializers
from apps.payments.models import PaymentGateway, Payment, Refund, Invoice


class PaymentGatewaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentGateway
        fields = [
            'id', 'name', 'gateway_type', 'display_name',
            'description', 'icon', 'is_active', 'order'
        ]


class PaymentSerializer(serializers.ModelSerializer):
    gateway = PaymentGatewaySerializer(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_ref', 'payment_type', 'customer_email',
            'gateway', 'amount', 'currency', 'status',
            'gateway_payment_id', 'refunded_amount',
            'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'payment_ref', 'status', 'gateway_payment_id',
            'refunded_amount', 'created_at', 'completed_at'
        ]


class CreatePaymentSerializer(serializers.Serializer):
    """Serializer for creating a new payment."""
    booking_type = serializers.ChoiceField(
        choices=['transfer', 'trip', 'rental']
    )
    booking_id = serializers.IntegerField()
    gateway_type = serializers.ChoiceField(
        choices=['stripe', 'paypal', 'cash']
    )
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    return_url = serializers.URLField(required=False)
    cancel_url = serializers.URLField(required=False)


class ConfirmPaymentSerializer(serializers.Serializer):
    """Serializer for confirming a payment."""
    payment_ref = serializers.CharField()
    # For PayPal
    payer_id = serializers.CharField(required=False)


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = [
            'id', 'refund_ref', 'payment', 'amount', 'reason',
            'status', 'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'refund_ref', 'payment', 'status',
            'created_at', 'completed_at'
        ]


class CreateRefundSerializer(serializers.Serializer):
    """Serializer for creating a refund."""
    payment_ref = serializers.CharField()
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False
    )
    reason = serializers.CharField(required=False)


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer_name', 'customer_email',
            'customer_address', 'subtotal', 'tax_rate', 'tax_amount',
            'total', 'currency', 'line_items', 'notes', 'status',
            'pdf_file', 'issue_date', 'due_date', 'paid_date'
        ]


class PaymentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    gateway_name = serializers.CharField(source='gateway.display_name')

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_ref', 'payment_type', 'customer_email',
            'gateway_name', 'amount', 'currency', 'status', 'created_at'
        ]
