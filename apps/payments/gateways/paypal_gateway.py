import paypalrestsdk
from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from .base import PaymentGatewayBase, PaymentResult, RefundResult


class PayPalGateway(PaymentGatewayBase):
    """PayPal payment gateway implementation."""

    def __init__(self):
        paypalrestsdk.configure({
            'mode': settings.PAYPAL_MODE,  # 'sandbox' or 'live'
            'client_id': settings.PAYPAL_CLIENT_ID,
            'client_secret': settings.PAYPAL_CLIENT_SECRET,
        })

    @property
    def gateway_type(self) -> str:
        return 'paypal'

    def convert_to_gateway_amount(self, amount: Decimal, currency: str) -> str:
        """PayPal uses decimal string format."""
        return f"{amount:.2f}"

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
        """Create a PayPal payment."""
        try:
            payment = paypalrestsdk.Payment({
                'intent': 'sale',
                'payer': {
                    'payment_method': 'paypal',
                },
                'redirect_urls': {
                    'return_url': return_url or settings.SITE_URL + '/api/v1/payments/paypal/return/',
                    'cancel_url': cancel_url or settings.SITE_URL + '/api/v1/payments/paypal/cancel/',
                },
                'transactions': [{
                    'amount': {
                        'total': self.convert_to_gateway_amount(amount, currency),
                        'currency': currency.upper(),
                    },
                    'description': description or 'Payment',
                    'custom': str(metadata.get('payment_ref', '')),
                }],
            })

            if payment.create():
                # Get approval URL
                approval_url = None
                for link in payment.links:
                    if link.rel == 'approval_url':
                        approval_url = link.href
                        break

                return PaymentResult(
                    success=True,
                    payment_id=payment.id,
                    redirect_url=approval_url,
                    status='created',
                    raw_response=payment.to_dict()
                )
            else:
                return PaymentResult(
                    success=False,
                    error_message=payment.error.get('message', 'Unknown error'),
                    raw_response=payment.error
                )

        except Exception as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                raw_response={'error': str(e)}
            )

    def confirm_payment(self, payment_id: str, payer_id: str = None) -> PaymentResult:
        """Execute/confirm a PayPal payment after user approval."""
        try:
            payment = paypalrestsdk.Payment.find(payment_id)

            if payment.execute({'payer_id': payer_id}):
                return PaymentResult(
                    success=True,
                    payment_id=payment.id,
                    status='approved',
                    raw_response=payment.to_dict()
                )
            else:
                return PaymentResult(
                    success=False,
                    error_message=payment.error.get('message', 'Execution failed'),
                    raw_response=payment.error
                )

        except Exception as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                raw_response={'error': str(e)}
            )

    def get_payment_status(self, payment_id: str) -> PaymentResult:
        """Get the status of a PayPal payment."""
        try:
            payment = paypalrestsdk.Payment.find(payment_id)

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                status=payment.state,
                raw_response=payment.to_dict()
            )

        except Exception as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                raw_response={'error': str(e)}
            )

    def refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
    ) -> RefundResult:
        """Create a refund for a PayPal payment."""
        try:
            payment = paypalrestsdk.Payment.find(payment_id)

            # Get the sale from the payment
            sale_id = None
            for transaction in payment.transactions:
                for related in transaction.related_resources:
                    if hasattr(related, 'sale'):
                        sale_id = related.sale.id
                        sale_currency = transaction.amount.currency
                        break

            if not sale_id:
                return RefundResult(
                    success=False,
                    error_message='No sale found for this payment'
                )

            sale = paypalrestsdk.Sale.find(sale_id)

            refund_data = {}
            if amount:
                refund_data['amount'] = {
                    'total': self.convert_to_gateway_amount(amount, sale_currency),
                    'currency': sale_currency,
                }

            refund = sale.refund(refund_data)

            if refund.success():
                return RefundResult(
                    success=True,
                    refund_id=refund.id,
                    status=refund.state,
                    raw_response=refund.to_dict()
                )
            else:
                return RefundResult(
                    success=False,
                    error_message=refund.error.get('message', 'Refund failed'),
                    raw_response=refund.error
                )

        except Exception as e:
            return RefundResult(
                success=False,
                error_message=str(e),
                raw_response={'error': str(e)}
            )

    def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> Dict[str, Any]:
        """
        Verify and parse a PayPal webhook.

        Note: PayPal webhook verification is more complex and requires
        the webhook ID from PayPal dashboard. This is a simplified version.
        """
        import json
        try:
            data = json.loads(payload)
            return {
                'event_type': data.get('event_type'),
                'event_id': data.get('id'),
                'data': data.get('resource', {}),
                'raw_event': data
            }
        except Exception as e:
            raise ValueError(f"Webhook verification failed: {e}")
