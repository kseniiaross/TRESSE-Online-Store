from rest_framework import serializers
from .models import (
    Cart, CartItem, Category, Product, Review,
    ProductImage, ProductSize, ProductWishlist, Size
)


# -------------------------
# Helpers / small serializers
# -------------------------

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "sort_order", "alt_text"]


class ProductMiniSerializer(serializers.ModelSerializer):
    main_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "main_image_url"]

    def get_main_image_url(self, obj):
        request = self.context.get("request")
        if obj.main_image:
            return request.build_absolute_uri(obj.main_image.url) if request else obj.main_image.url
        return None


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name"]


# ✅ must be AFTER SizeSerializer
class ProductSizeInlineSerializer(serializers.ModelSerializer):
    size = SizeSerializer(read_only=True)

    class Meta:
        model = ProductSize
        fields = ["id", "size", "quantity"]


# -------------------------
# Main Product serializer (catalog)
# -------------------------

class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    sizes = ProductSizeInlineSerializer(many=True, read_only=True)

    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    main_image_url = serializers.SerializerMethodField()

    is_in_wishlist = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "category_name",
            "category_slug",
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

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("The price cannot be zero")
        return value

    def get_main_image_url(self, obj):
        request = self.context.get("request")
        if obj.main_image:
            return request.build_absolute_uri(obj.main_image.url) if request else obj.main_image.url
        return None

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


# -------------------------
# Cart serializers
# -------------------------

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
        write_only=True
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


# -------------------------
# Reviews
# -------------------------

class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.first_name", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "product", "user_email", "rating", "comment", "created_at"]
        read_only_fields = ["created_at", "user", "product"]  # ✅ fixed

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value