# products/admin.py
from __future__ import annotations

from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Category,
    Collection,
    Product,
    Size,
    ProductSize,
    Cart,
    CartItem,
    Review,
    ProductImage,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 1
    fields = ("size", "quantity")


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("preview", "image", "alt_text", "is_primary", "sort_order")
    readonly_fields = ("preview",)
    ordering = ("sort_order", "id")

    def preview(self, obj):
        if not obj or not getattr(obj, "image", None):
            return "—"
        try:
            url = obj.image.url
        except Exception:
            url = None
        if not url:
            return "—"
        return format_html(
            '<img src="{}" style="height:60px;width:60px;border-radius:8px;object-fit:cover;" />',
            url,
        )

    preview.short_description = "Preview"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "price", "available", "created_at")
    list_filter = ("available", "category", "collections")
    search_fields = ("name", "description")

    # ✅ галочки для коллекций
    filter_horizontal = ("collections",)

    inlines = (ProductSizeInline, ProductImageInline)

    autocomplete_fields = ("category",)


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(ProductSize)
class ProductSizeAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "size", "quantity")
    list_filter = ("size",)
    search_fields = ("product__name", "size__name")


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at", "updated_at")
    search_fields = ("user__email",)


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("id", "cart", "product_size", "quantity")
    search_fields = ("cart__user__email", "product_size__product__name", "product_size__size__name")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("product__name", "user__email", "comment")


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "is_primary", "sort_order")
    list_filter = ("is_primary",)
    search_fields = ("product__name", "alt_text")
    ordering = ("product", "sort_order", "id")