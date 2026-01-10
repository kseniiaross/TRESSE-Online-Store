# products/emails.py
from __future__ import annotations
from typing import Any
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string


def send_back_in_stock_email(*, to_email: str, product_name: str, product_url: str = "") -> None:
    if not to_email:
        return

    body = render_to_string(
        "emails/products/back_in_stock.txt",
        {"product_name": product_name, "product_url": product_url, "support_email": getattr(settings, "SUPPORT_EMAIL", "")},
    )

    msg = EmailMessage(
        subject=f"TRESSE — Back in stock: {product_name}",
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
        reply_to=[getattr(settings, "SUPPORT_EMAIL", settings.DEFAULT_FROM_EMAIL)],
    )
    msg.send(fail_silently=False)