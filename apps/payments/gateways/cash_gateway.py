import uuid
from decimal import Decimal
from typing import Optional, Dict, Any

from .base import PaymentGatewayBase, PaymentResult, RefundResult


class CashGateway(PaymentGatewayBase):
    """Cash on delivery payment gateway."""

    @property
    def gateway_type(self) -> str:
        return 'cash'

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
        payment_id = f"CASH-{uuid.uuid4().hex[:12].upper()}"
        return PaymentResult(
            success=True,
            payment_id=payment_id,
            status='pending',
        )

    def confirm_payment(self, payment_id: str, **kwargs) -> PaymentResult:
        return PaymentResult(
            success=True,
            payment_id=payment_id,
            status='succeeded',
        )

    def get_payment_status(self, payment_id: str) -> PaymentResult:
        return PaymentResult(
            success=True,
            payment_id=payment_id,
            status='pending',
        )

    def refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
    ) -> RefundResult:
        return RefundResult(
            success=True,
            refund_id=f"CASH-REF-{uuid.uuid4().hex[:8].upper()}",
            status='completed',
        )

    def verify_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        return {}
