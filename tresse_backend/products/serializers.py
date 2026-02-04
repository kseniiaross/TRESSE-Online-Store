from __future__ import annotations

from urllib.parse import urlparse, urlunparse

from rest_framework import serializers

from .models import (
    Cart,
    CartItem,
    Category,
    Collection,
    Product,
    ProductImage,
    ProductSize,
    ProductWishlist,
    Size,
)


def force_https(url: str) -> str:
    """
    Forces https scheme for absolute URLs (fixes proxy/http issues in prod).
    Leaves relative URLs untouched.
    """
    if not url:
        return url

    parsed = urlparse(url)

    if not parsed.scheme:
        return url

    if parsed.scheme == "http":
        parsed = parsed._replace(scheme="https")
        return urlunparse(parsed)

    return url


def build_abs_https(request, url: str) -> str:
    """
    Builds absolute URL (if relative) and forces https scheme.
    """
    if not url:
        return url

    if request and url.startswith("/"):
        url = request.build_absolute_uri(url)

    return force_https(url)


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "sort_order", "alt_text", "is_primary"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        return build_abs_https(request, url)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "name", "slug"]


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name"]


class ProductSizeInlineSerializer(serializers.ModelSerializer):
    size = SizeSerializer(read_only=True)

    class Meta:
        model = ProductSize
        fields = ["id", "size", "quantity"]


class ProductMiniSerializer(serializers.ModelSerializer):
    main_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "main_image_url"]

    def get_main_image_url(self, obj):
        if not obj.main_image:
            return None
        request = self.context.get("request")
        url = obj.main_image.url
        return build_abs_https(request, url)


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    sizes = ProductSizeInlineSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    collections = CollectionSerializer(many=True, read_only=True)

    main_image_url = serializers.SerializerMethodField()
    collections_slugs = serializers.SerializerMethodField()
    collections_names = serializers.SerializerMethodField()
    is_in_wishlist = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "category",
            "collections",
            "collections_slugs",
            "collections_names",
            "name",
            "description",
            "price",
            "available",
            "main_image_url",
            "images",
            "sizes",
            "is_in_wishlist",
            "in_stock",
        ]

    def get_main_image_url(self, obj):
        if not obj.main_image:
            return None
        request = self.context.get("request")
        url = obj.main_image.url
        return build_abs_https(request, url)

    def get_collections_slugs(self, obj):
        return [c.slug for c in obj.collections.all()]

    def get_collections_names(self, obj):
        return [c.name for c in obj.collections.all()]

    def get_is_in_wishlist(self, obj):
        annotated = getattr(obj, "_is_in_wishlist", None)
        if annotated is not None:
            return annotated

        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return ProductWishlist.objects.filter(user=user, product=obj).exists()
        return False

    def get_in_stock(self, obj):
        annotated = getattr(obj, "_in_stock", None)
        if annotated is not None:
            return annotated
        return obj.sizes.filter(quantity__gt=0).exists()


class ProductSizeSerializer(serializers.ModelSerializer):
    product = ProductMiniSerializer(read_only=True)
    size = SizeSerializer(read_only=True)

    class Meta:
        model = ProductSize
        fields = ["id", "product", "size", "quantity"]


class CartItemSerializer(serializers.ModelSerializer):
    product_size = ProductSizeSerializer(read_only=True)
    product_size_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductSize.objects.all(),
        source="product_size",
        write_only=True,
    )

    class Meta:
        model = CartItem
        fields = ["id", "product_size", "product_size_id", "quantity"]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "user", "created_at", "items"]
        read_only_fields = ["user"]


