from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any
from decimal import Decimal


@dataclass
class PaymentResult:
    """Result of a payment operation."""
    success: bool
    payment_id: Optional[str] = None
    client_secret: Optional[str] = None  # For frontend confirmation
    redirect_url: Optional[str] = None  # For redirect-based flows
    status: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


@dataclass
class RefundResult:
    """Result of a refund operation."""
    success: bool
    refund_id: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class PaymentGatewayBase(ABC):
    """
    Abstract base class for payment gateways.

    To add a new payment gateway:
    1. Create a new file (e.g., new_gateway.py)
    2. Inherit from PaymentGatewayBase
    3. Implement all abstract methods
    4. Register in __init__.py get_gateway function

    Example:
        class NewGateway(PaymentGatewayBase):
            def create_payment(self, amount, currency, metadata):
                # Implement gateway-specific logic
                pass
    """

    @property
    @abstractmethod
    def gateway_type(self) -> str:
        """Return the gateway type identifier."""
        pass

    @abstractmethod
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
        """
        Create a new payment.

        Args:
            amount: Payment amount
            currency: Currency code (e.g., 'MAD', 'USD')
            metadata: Additional data to store with the payment
            customer_email: Customer's email address
            description: Payment description
            return_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is cancelled

        Returns:
            PaymentResult with payment details or error
        """
        pass

    @abstractmethod
    def confirm_payment(self, payment_id: str) -> PaymentResult:
        """
        Confirm/capture a payment.

        Args:
            payment_id: The payment ID from the gateway

        Returns:
            PaymentResult with updated status
        """
        pass

    @abstractmethod
    def get_payment_status(self, payment_id: str) -> PaymentResult:
        """
        Get the current status of a payment.

        Args:
            payment_id: The payment ID from the gateway

        Returns:
            PaymentResult with current status
        """
        pass

    @abstractmethod
    def refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
    ) -> RefundResult:
        """
        Refund a payment (full or partial).

        Args:
            payment_id: The payment ID from the gateway
            amount: Amount to refund (None for full refund)
            reason: Reason for the refund

        Returns:
            RefundResult with refund details or error
        """
        pass

    @abstractmethod
    def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> Dict[str, Any]:
        """
        Verify and parse a webhook from the gateway.

        Args:
            payload: Raw webhook payload
            signature: Webhook signature from headers

        Returns:
            Parsed webhook data

        Raises:
            ValueError: If webhook verification fails
        """
        pass

    def convert_to_gateway_amount(self, amount: Decimal, currency: str) -> int:
        """
        Convert decimal amount to gateway format.
        Most gateways expect amounts in smallest currency unit (cents).

        Override this method if the gateway uses different amount format.
        """
        # Default: multiply by 100 for cents-based currencies
        return int(amount * 100)

    def convert_from_gateway_amount(self, amount: int, currency: str) -> Decimal:
        """
        Convert gateway amount back to decimal.
        """
        return Decimal(amount) / 100
