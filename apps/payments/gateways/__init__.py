from .base import PaymentGatewayBase
from .stripe_gateway import StripeGateway
from .paypal_gateway import PayPalGateway
from .cash_gateway import CashGateway

__all__ = ['PaymentGatewayBase', 'StripeGateway', 'PayPalGateway', 'CashGateway', 'get_gateway']


def get_gateway(gateway_type: str) -> PaymentGatewayBase:
    """
    Factory function to get the appropriate payment gateway instance.

    Usage:
        gateway = get_gateway('stripe')
        result = gateway.create_payment(amount=100, currency='MAD', metadata={})
    """
    gateways = {
        'stripe': StripeGateway,
        'paypal': PayPalGateway,
        'cash': CashGateway,
    }

    gateway_class = gateways.get(gateway_type)
    if not gateway_class:
        raise ValueError(f"Unknown gateway type: {gateway_type}")

    return gateway_class()
