from __future__ import annotations

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import logging
from typing import Any, Iterable, Tuple

import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Cart, CartItem
from .emails import (
    send_order_canceled_email,
    send_order_confirmation_email,
    send_refund_initiated_email,
)
from .models import Order, OrderItem
from .serializers import OrderCreateSerializer, OrderReadSerializer
from .throttles import StripeIntentAnonThrottle, StripeIntentUserThrottle

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


def _to_cents(amount: Decimal) -> int:
    # Convert Decimal dollars to integer cents using safe rounding for Stripe.
    cents = (amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


def _build_cart_signature(items: Iterable[CartItem]) -> str:
    # Deterministic signature of cart contents to build a stable idempotency key.
    parts = [f"{ci.product_size_id}:{ci.quantity}" for ci in items]
    raw = "|".join(sorted(parts))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def _safe_str(v: Any) -> str:
    return str(v or "").strip()


def _extract_card_details_from_intent(intent: Any) -> Tuple[str, str, str]:
    card_brand = ""
    card_last4 = ""
    cardholder_name = ""

    latest_charge = intent.get("latest_charge")

    if isinstance(latest_charge, str) and latest_charge:
        try:
            latest_charge = stripe.Charge.retrieve(latest_charge)
        except Exception:
            latest_charge = None

    if isinstance(latest_charge, dict):
        try:
            pm_details = latest_charge.get("payment_method_details") or {}
            card = (pm_details.get("card") or {})
            card_brand = _safe_str(card.get("brand"))
            card_last4 = _safe_str(card.get("last4"))

            billing = latest_charge.get("billing_details") or {}
            cardholder_name = _safe_str(billing.get("name"))
        except Exception:
            pass

    if not cardholder_name:
        payment_method_id = _safe_str(intent.get("payment_method"))
        if payment_method_id:
            try:
                pm = stripe.PaymentMethod.retrieve(payment_method_id)
                billing = (pm.get("billing_details") or {})
                cardholder_name = _safe_str(billing.get("name"))
            except Exception:
                pass

    return card_brand, card_last4, cardholder_name


def _build_items_payload(order: Order) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = []
    for it in order.items.all():
        payload.append(
            {
                "product_name": (it.product.name if it.product_id else ""),
                "quantity": it.quantity,
                "size": it.size,
                "unit_price": it.unit_price,
            }
        )
    return payload


class MyOrdersAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects.filter(user=request.user)
            .order_by("-created_at")
            .prefetch_related(
                "items",
                "items__product_size",
                "items__product_size__product",
                "items__product_size__size",
            )
        )
        return Response(OrderReadSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class CreateOrderAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payment_intent_id = _safe_str((request.data or {}).get("payment_intent_id"))
        if not payment_intent_id:
            return Response({"detail": "payment_intent_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        create_ser = OrderCreateSerializer(data=request.data)
        create_ser.is_valid(raise_exception=True)

        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_items = CartItem.objects.filter(cart=cart).select_related(
            "product_size__product",
            "product_size__size",
        )

        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        total = Decimal("0.00")
        for ci in cart_items:
            ps = ci.product_size
            product = ps.product
            size_name = getattr(getattr(ps, "size", None), "name", "")

            if ps.quantity < ci.quantity:
                return Response(
                    {"detail": f"Not enough stock for size '{size_name}' of '{product.name}'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            total += Decimal(str(product.price)) * Decimal(ci.quantity)

        if total <= 0:
            return Response({"detail": "Invalid cart total"}, status=status.HTTP_400_BAD_REQUEST)

        expected_cents = _to_cents(total)

        try:
            intent = stripe.PaymentIntent.retrieve(
                payment_intent_id,
                expand=["latest_charge", "payment_method"],
            )
        except Exception:
            return Response({"detail": "Invalid payment_intent_id"}, status=status.HTTP_400_BAD_REQUEST)

        if _safe_str(intent.get("status")) != "succeeded":
            return Response(
                {"detail": f"Payment not completed (status: {intent.get('status')})"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        paid_cents = int(intent.get("amount_received", 0) or 0)
        if paid_cents != expected_cents:
            return Response({"detail": "Paid amount does not match cart total"}, status=status.HTTP_400_BAD_REQUEST)

        if _safe_str(intent.get("currency")).lower() != "usd":
            return Response({"detail": "Invalid currency"}, status=status.HTTP_400_BAD_REQUEST)

        meta_user_id = (intent.get("metadata") or {}).get("user_id")
        if _safe_str(meta_user_id) != str(request.user.id):
            return Response({"detail": "Payment does not belong to this user"}, status=status.HTTP_403_FORBIDDEN)

        card_brand, card_last4, cardholder_name = _extract_card_details_from_intent(intent)

        existing = Order.objects.filter(user=request.user, stripe_payment_intent=payment_intent_id).first()
        if existing:
            return Response(OrderReadSerializer(existing).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            order = Order.objects.create(
                user=request.user,
                email=getattr(request.user, "email", "") or "",
                currency="usd",
                status="paid",
                total_amount=total,
                stripe_payment_intent=payment_intent_id,
                card_brand=card_brand,
                card_last4=card_last4,
                cardholder_name=cardholder_name,
                **create_ser.validated_data,
            )

            for ci in cart_items:
                ps = ci.product_size
                product = ps.product
                size_name = getattr(getattr(ps, "size", None), "name", "")

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_size=ps,
                    size=size_name,
                    quantity=ci.quantity,
                    unit_price=Decimal(str(product.price)),
                )

                ps.quantity = ps.quantity - ci.quantity
                ps.save(update_fields=["quantity"])

            cart_items.delete()

            def _send_email_after_commit(order_id: int) -> None:
                try:
                    fresh = (
                        Order.objects.select_related("user")
                        .prefetch_related("items", "items__product")
                        .get(id=order_id)
                    )
                    items_payload = _build_items_payload(fresh)
                    send_order_confirmation_email(order=fresh, items=items_payload)
                except Exception:
                    logger.exception("order_confirmation_email_failed order_id=%s", order_id)

            transaction.on_commit(lambda: _send_email_after_commit(order.id))

        return Response(OrderReadSerializer(order).data, status=status.HTTP_201_CREATED)


class CancelOrderAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id: int):
        order = Order.objects.filter(id=order_id, user=request.user).first()
        if not order:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        if order.status != "paid":
            return Response({"detail": "Only paid orders can be canceled"}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() - order.created_at > timedelta(hours=24):
            return Response({"detail": "Cancellation window has expired"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if order.stripe_payment_intent:
                try:
                    stripe.Refund.create(payment_intent=order.stripe_payment_intent)
                except Exception:
                    return Response({"detail": "Refund failed"}, status=status.HTTP_400_BAD_REQUEST)

            order.status = "canceled"
            order.save(update_fields=["status"])

            def _send_cancel_emails_after_commit(order_id_: int) -> None:
                try:
                    fresh = (
                        Order.objects.select_related("user")
                        .prefetch_related("items", "items__product")
                        .get(id=order_id_)
                    )
                    items_payload = _build_items_payload(fresh)
                    send_order_canceled_email(order=fresh, items=items_payload)
                    send_refund_initiated_email(order=fresh)
                except Exception:
                    logger.exception("order_cancel_email_failed order_id=%s", order_id_)

            transaction.on_commit(lambda: _send_cancel_emails_after_commit(order.id))

        return Response(OrderReadSerializer(order).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([StripeIntentAnonThrottle, StripeIntentUserThrottle])
def create_payment_intent(request):
    attempt_id = _safe_str((request.data or {}).get("attempt_id"))
    if not attempt_id:
        return Response({"detail": "attempt_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    items = CartItem.objects.filter(cart=cart).select_related("product_size__product", "product_size__size")

    if not items.exists():
        return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

    total = Decimal("0.00")
    for ci in items:
        price = Decimal(str(ci.product_size.product.price))
        total += price * Decimal(ci.quantity)

    if total <= 0:
        return Response({"detail": "Invalid cart total"}, status=status.HTTP_400_BAD_REQUEST)

    amount_cents = _to_cents(total)
    cart_sig = _build_cart_signature(items)

    # attempt_id ensures a fresh idempotency key per client attempt,
    # while cart_sig prevents charging stale cart content.
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
        logger.exception("stripe_payment_intent_create_failed user_id=%s cart_id=%s", request.user.id, cart.id)
        return Response({"detail": "Payment could not be prepared."}, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        logger.exception("payment_intent_unexpected_error user_id=%s cart_id=%s", request.user.id, cart.id)
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
        stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        return Response({"detail": "Invalid webhook"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"ok": True}, status=status.HTTP_200_OK)