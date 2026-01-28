import stripe
from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from .base import PaymentGatewayBase, PaymentResult, RefundResult


class StripeGateway(PaymentGatewayBase):
    """Stripe payment gateway implementation."""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    @property
    def gateway_type(self) -> str:
        return 'stripe'

    def create_payment(
        self,
        amount: Decimal,
        currency: str,
        metadata: Dict[str, Any],
        customer_email: Optional[str] = None,
        description: Optional[str] = None,
        return_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> PaymentResult:
        """Create a Stripe PaymentIntent."""
        try:
            # Create or get customer
            customer_id = None
            if customer_email:
                customers = stripe.Customer.list(email=customer_email, limit=1)
                if customers.data:
                    customer_id = customers.data[0].id
                else:
                    customer = stripe.Customer.create(email=customer_email)
                    customer_id = customer.id

            # Create PaymentIntent
            intent_params = {
                'amount': self.convert_to_gateway_amount(amount, currency),
                'currency': currency.lower(),
                'metadata': metadata,
                'automatic_payment_methods': {'enabled': True},
            }

            if customer_id:
                intent_params['customer'] = customer_id

            if description:
                intent_params['description'] = description

            if return_url:
                intent_params['return_url'] = return_url

            payment_intent = stripe.PaymentIntent.create(**intent_params)

            return PaymentResult(
                success=True,
                payment_id=payment_intent.id,
                client_secret=payment_intent.client_secret,
                status=payment_intent.status,
                raw_response=dict(payment_intent)
            )

        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e.user_message or e),
                raw_response={'error': str(e)}
            )

    def confirm_payment(self, payment_id: str) -> PaymentResult:
        """Confirm/capture a Stripe PaymentIntent."""
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_id)

            if payment_intent.status == 'requires_capture':
                payment_intent = stripe.PaymentIntent.capture(payment_id)

            return PaymentResult(
                success=payment_intent.status in ['succeeded', 'processing'],
                payment_id=payment_intent.id,
                status=payment_intent.status,
                raw_response=dict(payment_intent)
            )

        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e.user_message or e),
                raw_response={'error': str(e)}
            )

    def get_payment_status(self, payment_id: str) -> PaymentResult:
        """Get the status of a Stripe PaymentIntent."""
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_id)

            return PaymentResult(
                success=True,
                payment_id=payment_intent.id,
                status=payment_intent.status,
                raw_response=dict(payment_intent)
            )

        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e.user_message or e),
                raw_response={'error': str(e)}
            )

    def refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
    ) -> RefundResult:
        """Create a refund for a Stripe payment."""
        try:
            refund_params = {'payment_intent': payment_id}

            if amount:
                # Get the payment to know the currency
                payment_intent = stripe.PaymentIntent.retrieve(payment_id)
                refund_params['amount'] = self.convert_to_gateway_amount(
                    amount,
                    payment_intent.currency
                )

            if reason:
                # Stripe accepts: duplicate, fraudulent, requested_by_customer
                refund_params['reason'] = 'requested_by_customer'
                refund_params['metadata'] = {'reason_detail': reason}

            refund = stripe.Refund.create(**refund_params)

            return RefundResult(
                success=refund.status in ['succeeded', 'pending'],
                refund_id=refund.id,
                status=refund.status,
                raw_response=dict(refund)
            )

        except stripe.error.StripeError as e:
            return RefundResult(
                success=False,
                error_message=str(e.user_message or e),
                raw_response={'error': str(e)}
            )

    def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> Dict[str, Any]:
        """Verify and parse a Stripe webhook."""
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret
            )
            return {
                'event_type': event.type,
                'event_id': event.id,
                'data': event.data.object,
                'raw_event': dict(event)
            }
        except stripe.error.SignatureVerificationError as e:
            raise ValueError(f"Invalid webhook signature: {e}")
        except Exception as e:
            raise ValueError(f"Webhook verification failed: {e}")

    def create_checkout_session(
        self,
        amount: Decimal,
        currency: str,
        metadata: Dict[str, Any],
        success_url: str,
        cancel_url: str,
        customer_email: Optional[str] = None,
        description: Optional[str] = None,
    ) -> PaymentResult:
        """
        Create a Stripe Checkout Session for redirect-based flow.
        Alternative to PaymentIntent for simpler integration.
        """
        try:
            session_params = {
                'payment_method_types': ['card'],
                'mode': 'payment',
                'success_url': success_url,
                'cancel_url': cancel_url,
                'metadata': metadata,
                'line_items': [{
                    'price_data': {
                        'currency': currency.lower(),
                        'unit_amount': self.convert_to_gateway_amount(amount, currency),
                        'product_data': {
                            'name': description or 'Payment',
                        },
                    },
                    'quantity': 1,
                }],
            }

            if customer_email:
                session_params['customer_email'] = customer_email

            session = stripe.checkout.Session.create(**session_params)

            return PaymentResult(
                success=True,
                payment_id=session.id,
                redirect_url=session.url,
                status='pending',
                raw_response=dict(session)
            )

        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e.user_message or e),
                raw_response={'error': str(e)}
            )
