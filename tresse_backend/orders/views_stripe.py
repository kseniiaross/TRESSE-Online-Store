from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
import hashlib
import logging

import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from products.models import Cart, CartItem
from .throttles import StripeIntentAnonThrottle, StripeIntentUserThrottle

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


def _money_to_cents(amount: Decimal) -> int:
    cents = (amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


def _build_cart_signature(items) -> str:
    parts = [f"{ci.product_size_id}:{ci.quantity}" for ci in items]
    raw = "|".join(sorted(parts))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([StripeIntentAnonThrottle, StripeIntentUserThrottle])
def create_payment_intent(request):
    attempt_id = str((request.data or {}).get("attempt_id") or "").strip()
    if not attempt_id:
        return Response({"detail": "attempt_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    cart, _ = Cart.objects.get_or_create(user=request.user)

    items = (
        CartItem.objects
        .filter(cart=cart)
        .select_related("product_size__product", "product_size__size")
    )

    if not items.exists():
        return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

    total = Decimal("0.00")
    for ci in items:
        price = Decimal(str(ci.product_size.product.price))
        total += price * Decimal(ci.quantity)

    if total <= 0:
        return Response({"detail": "Invalid cart total"}, status=status.HTTP_400_BAD_REQUEST)

    amount_cents = _money_to_cents(total)
    cart_sig = _build_cart_signature(items)

    idempotency_key = f"pi_u{request.user.id}_c{cart.id}_a{amount_cents}_{cart_sig}_att{attempt_id}"

    user_email = getattr(request.user, "email", "") or None

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            automatic_payment_methods={"enabled": True},
            receipt_email=user_email,  
            description=f"TRESSE order payment (cart #{cart.id})",
            metadata={
                "user_id": str(request.user.id),
                "cart_id": str(cart.id),
                "amount_cents": str(amount_cents),
                "cart_sig": cart_sig,
                "attempt_id": attempt_id,
            },
            idempotency_key=idempotency_key,
        )

        return Response(
            {"client_secret": intent.client_secret, "payment_intent_id": intent.id},
            status=status.HTTP_200_OK,
        )

    except stripe.error.StripeError:
        logger.exception(
            "stripe_payment_intent_create_failed user_id=%s cart_id=%s",
            request.user.id,
            cart.id,
        )
        return Response({"detail": "Payment could not be prepared."}, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        logger.exception(
            "payment_intent_unexpected_error user_id=%s cart_id=%s",
            request.user.id,
            cart.id,
        )
        return Response({"detail": "Payment could not be prepared."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    if not webhook_secret:
        return Response({"detail": "Webhook secret not set"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        return Response({"detail": "Invalid webhook"}, status=status.HTTP_400_BAD_REQUEST)


    return Response({"ok": True}, status=status.HTTP_200_OK)