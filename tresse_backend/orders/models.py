from __future__ import annotations

import secrets
import string
from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product, ProductSize

User = get_user_model()


def _gen_public_id(prefix: str = "TR") -> str:
    """
    Format: TR-YYYYMMDD-XXXXXX
    - Date: local server date (good enough for public order number)
    - Suffix: 6 chars from a safe alphabet (no O/0, I/1)
    """
    from django.utils import timezone

    date_part = timezone.localdate().strftime("%Y%m%d")

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))

    return f"{prefix}-{date_part}-{suffix}"


class Order(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders",
    )

    public_id = models.CharField(max_length=24, unique=True, db_index=True, blank=True, null=True)

    full_name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)

    payment_method = models.CharField(
        max_length=20,
        choices=[("card", "Card"), ("paypal", "PayPal")],
        default="card",
    )

    email = models.EmailField(blank=True, null=True)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=10, default="usd")

    stripe_checkout_id = models.CharField(max_length=255, blank=True, null=True)

    stripe_payment_intent = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
    )

    status = models.CharField(
        max_length=32,
        default="pending",
        choices=[("pending", "pending"), ("paid", "paid"), ("canceled", "canceled")],
    )

    card_brand = models.CharField(max_length=32, blank=True, default="")
    card_last4 = models.CharField(max_length=4, blank=True, null=True)
    cardholder_name = models.CharField(max_length=100, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        shown = self.public_id or f"#{self.id}"
        return f"Order {shown} by {self.email or self.user.email}"

    def save(self, *args, **kwargs):
        if self.user_id and not self.email:
            self.email = self.user.email

        if not self.public_id:
            for _ in range(7):
                candidate = _gen_public_id("TR")
                if not Order.objects.filter(public_id=candidate).exists():
                    self.public_id = candidate
                    break

        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    product_size = models.ForeignKey(ProductSize, on_delete=models.PROTECT, null=True, blank=True)

    size = models.CharField(max_length=16, blank=True, default="")
    quantity = models.PositiveIntegerField(default=1)

    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product.name} (Order #{self.order_id})"