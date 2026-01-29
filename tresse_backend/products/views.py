from __future__ import annotations
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import BooleanField, Exists, OuterRef, Value
from django.shortcuts import get_object_or_404

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ProductFilter
from .models import (
    Cart,
    CartItem,
    Product,
    ProductSize,
    ProductWishlist,
    Review,
    StockSubscription,
)
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    ProductSerializer,
    ReviewSerializer,
)
from .throttles import StockSubscribeAnonThrottle, StockSubscribeUserThrottle


class ProductPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100


class CartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)

        cart = (
            Cart.objects.filter(pk=cart.pk)
            .select_related("user")
            .prefetch_related(
                "items__product_size__size",
                "items__product_size__product__images",
                "items__product_size__product__category",
                "items__product_size__product__collections",
            )
            .first()
        )

        serializer = CartSerializer(cart, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CartItemAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartItemSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        product_size = serializer.validated_data["product_size"]
        quantity_to_add = serializer.validated_data["quantity"]

        if quantity_to_add < 1:
            return Response({"quantity": "Must be >= 1"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            ps = ProductSize.objects.select_for_update().get(pk=product_size.pk)

            item = (
                CartItem.objects.filter(cart=cart, product_size=ps)
                .select_for_update()
                .first()
            )

            current_qty = item.quantity if item else 0
            new_qty = current_qty + quantity_to_add

            if new_qty > ps.quantity:
                return Response(
                    {
                        "detail": "Not enough stock for this size.",
                        "available": ps.quantity,
                        "requested": new_qty,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if item:
                item.quantity = new_qty
                item.save(update_fields=["quantity"])
            else:
                item = CartItem.objects.create(cart=cart, product_size=ps, quantity=quantity_to_add)

        return Response(
            CartItemSerializer(item, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def put(self, request, item_id):
        cart = get_object_or_404(Cart, user=request.user)

        with transaction.atomic():
            item = get_object_or_404(
                CartItem.objects.select_for_update().select_related("product_size"),
                id=item_id,
                cart=cart,
            )

            serializer = CartItemSerializer(item, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            new_qty = serializer.validated_data.get("quantity", item.quantity)
            if new_qty < 1:
                return Response({"quantity": "Must be >= 1"}, status=status.HTTP_400_BAD_REQUEST)

            ps = ProductSize.objects.select_for_update().get(pk=item.product_size_id)

            if new_qty > ps.quantity:
                return Response(
                    {
                        "detail": "Not enough stock for this size.",
                        "available": ps.quantity,
                        "requested": new_qty,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item.quantity = new_qty
            item.save(update_fields=["quantity"])

        return Response(
            CartItemSerializer(item, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, item_id):
        cart = get_object_or_404(Cart, user=request.user)
        item = get_object_or_404(CartItem, id=item_id, cart=cart)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = ProductFilter
    pagination_class = ProductPagination
    search_fields = ["name", "description"]
    ordering_fields = ["price", "created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = getattr(self.request, "user", None)

        queryset = (
            Product.objects.select_related("category")
            .prefetch_related("images", "sizes", "collections")
            .annotate(
                _in_stock=Exists(
                    ProductSize.objects.filter(product_id=OuterRef("pk"), quantity__gt=0)
                )
            )
        )

        # /api/products/?category=woman
        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        # /api/products/?collection=bestsellers
        collection_slug = self.request.query_params.get("collection")
        if collection_slug:
            queryset = queryset.filter(collections__slug=collection_slug)

        if user and user.is_authenticated:
            queryset = queryset.annotate(
                _is_in_wishlist=Exists(
                    ProductWishlist.objects.filter(product_id=OuterRef("pk"), user=user)
                )
            )

        return queryset.distinct()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(methods=["post"], detail=True, permission_classes=[IsAuthenticated])
    def toggle_wishlist(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)

        obj, created = ProductWishlist.objects.get_or_create(user=request.user, product=product)
        if created:
            return Response({"is_in_wishlist": True}, status=status.HTTP_200_OK)

        obj.delete()
        return Response({"is_in_wishlist": False}, status=status.HTTP_200_OK)

    @action(
        methods=["post"],
        detail=True,
        url_path="subscribe_back_in_stock",
        permission_classes=[permissions.AllowAny],
        throttle_classes=[StockSubscribeAnonThrottle, StockSubscribeUserThrottle],
    )
    def subscribe_back_in_stock(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)
        email = (request.data.get("email") or "").strip()

        if not email:
            return Response({"email": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except ValidationError:
            return Response({"email": "Invalid email."}, status=status.HTTP_400_BAD_REQUEST)

        kwargs = {"product": product, "email": email}
        if request.user.is_authenticated:
            kwargs["user"] = request.user

        StockSubscription.objects.get_or_create(**kwargs)
        return Response({"ok": True, "subscribed": True, "email": email}, status=status.HTTP_200_OK)


class WishlistViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = ProductFilter
    ordering_fields = ["price", "created_at", "name"]
    ordering = ["-created_at"]

    @action(detail=False, methods=["get"])
    def count(self, request):
        n = ProductWishlist.objects.filter(user=request.user).count()
        return Response({"count": n}, status=status.HTTP_200_OK)

    def get_queryset(self):
        wish_ids = ProductWishlist.objects.filter(user=self.request.user).values_list("product_id", flat=True)

        return (
            Product.objects.filter(id__in=wish_ids)
            .select_related("category")
            .prefetch_related("images", "sizes", "collections")
            .annotate(
                _in_stock=Exists(ProductSize.objects.filter(product_id=OuterRef("pk"), quantity__gt=0)),
                _is_in_wishlist=Value(True, output_field=BooleanField()),
            )
            .distinct()
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class ReviewListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        product_id = self.kwargs["product_id"]
        return Review.objects.filter(product_id=product_id)

    def perform_create(self, serializer):
        product_id = self.kwargs["product_id"]
        product = get_object_or_404(Product, pk=product_id)
        serializer.save(user=self.request.user, product=product)