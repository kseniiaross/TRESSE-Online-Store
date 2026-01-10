from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product, Size, ProductSize, Cart, CartItem, Review, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    prepopulated_fields = {"slug": ("name",)}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("preview", "image", "alt_text", "is_primary", "sort_order")
    readonly_fields = ("preview",)
    ordering = ("sort_order", "id")

    def preview(self, obj):
        if obj and obj.image:
            return format_html('<img src="{}" style="height:60px;border-radius:6px;" />', obj.image.url)
        return "—"

    preview.short_description = "Preview"


class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 1
    fields = ("size", "quantity")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "price", "available", "created_at")
    list_filter = ("available", "category")
    search_fields = ("name", "description")
    inlines = [ProductSizeInline, ProductImageInline]


admin.site.register(Size)
admin.site.register(ProductSize)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Review)