from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet,
    CartAPIView,
    CartItemAPIView,
    WishlistViewSet,
    ReviewListCreateAPIView,
)

router = DefaultRouter()

# ✅ ВАЖНО: сначала wishlist
router.register(r"wishlist", WishlistViewSet, basename="wishlist")

# ✅ потом products с пустым префиксом (иначе он перехватит /wishlist/ как pk="wishlist")
router.register(r"", ProductViewSet, basename="product")

urlpatterns = [
    path("cart/", CartAPIView.as_view(), name="user-cart"),
    path("cart/items/", CartItemAPIView.as_view(), name="cart-items"),
    path("cart/items/<int:item_id>/", CartItemAPIView.as_view(), name="cart-item"),
    path("<int:product_id>/reviews/", ReviewListCreateAPIView.as_view(), name="product-reviews"),

    path("", include(router.urls)),
]