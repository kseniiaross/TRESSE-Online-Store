from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product_size.product.name", read_only=True)
    size = serializers.CharField(source="product_size.size.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_name",
            "size",
            "quantity",
            "unit_price",
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    """
    Only shipping/contact fields.
    Client does NOT send items/total.
    """
    class Meta:
        model = Order
        fields = [
            "full_name",
            "address",
            "city",
            "state",
            "postal_code",
            "country",
            "payment_method",
        ]


class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "public_id",  
            "full_name",
            "address",
            "city",
            "state",
            "postal_code",
            "country",
            "payment_method",
            "email",
            "total_amount",
            "currency",
            "stripe_payment_intent",
            "status",
            "created_at",
            "card_brand",
            "card_last4",
            "cardholder_name",
            "items",
        ]