from __future__ import annotations

from django.conf import settings
from django.db import models
from cloudinary.models import CloudinaryField


class ProductWishlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.CASCADE,
        related_name="wishlist",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="uniq_wishlist_user_product",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.product}"


class StockSubscription(models.Model):
    product = models.ForeignKey(
        "Product",
        on_delete=models.CASCADE,
        related_name="stock_subscriptions",
    )
    email = models.EmailField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="stock_subscriptions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "email"],
                name="uniq_stocksubscription_product_email",
            )
        ]

    def __str__(self) -> str:
        return f"{self.email} -> {self.product.name}"


class Category(models.Model):
   
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=64, unique=True)

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Collection(models.Model):

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=64, unique=True)

    class Meta:
        verbose_name = "Collection"
        verbose_name_plural = "Collections"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    class Meta:
        db_table = "products"
        ordering = ["-created_at"]

    category = models.ForeignKey(
        Category,
        related_name="products",
        on_delete=models.PROTECT, 
    )

    collections = models.ManyToManyField(
        Collection,
        related_name="products",
        blank=True,
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # Cloudinary
    main_image = CloudinaryField("main_image", blank=True, null=True)

    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Size(models.Model):
    name = models.CharField(max_length=10, unique=True)

    class Meta:
        verbose_name = "Size"
        verbose_name_plural = "Sizes"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ProductSize(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="sizes",
    )
    size = models.ForeignKey(Size, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "size"],
                name="uniq_product_size",
            )
        ]

    def __str__(self) -> str:
        return f"{self.product.name} - {self.size.name} ({self.quantity})"


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        email = getattr(self.user, "email", None) or str(self.user)
        return f"Cart of {email}"


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product_size = models.ForeignKey(ProductSize, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product_size"],
                name="uniq_cart_product_size",
            )
        ]

    def __str__(self) -> str:
        return f"{self.quantity} x {self.product_size.product.name} ({self.product_size.size.name})"


class Review(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "user"],
                name="uniq_review_product_user",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        email = getattr(self.user, "email", None) or str(self.user)
        return f"Review by {email} for {self.product.name}"


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="images",
        on_delete=models.CASCADE,
    )

    # Cloudinary
    image = CloudinaryField("image", blank=True, null=True)

    alt_text = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")

    def __str__(self) -> str:
        return f"{self.product.name} image"