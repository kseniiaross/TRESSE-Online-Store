from django_filters import rest_framework as filters
from django.db.models import Exists, OuterRef

from .models import Product, ProductSize


class ProductFilter(filters.FilterSet):
    category = filters.CharFilter(method="filter_category")
    available = filters.BooleanFilter(field_name="available")
    in_stock = filters.BooleanFilter(method="filter_in_stock")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    collection = filters.CharFilter(field_name="collections__slug", lookup_expr="iexact")

    class Meta:
        model = Product
        fields = ["category", "available", "in_stock", "min_price", "max_price", "collection"]

    def filter_category(self, qs, name, value):
        if not value:
            return qs

        v = value.strip().lower()
        aliases = {
            "women": "woman",
            "womens": "woman",
            "woman": "woman",
            "men": "man",
            "mens": "man",
            "man": "man",
            "kid": "kids",
            "kids": "kids",
        }
        return qs.filter(category__slug__iexact=aliases.get(v, v))

    def filter_in_stock(self, qs, name, value):
        if value is None:
            return qs

        return qs.filter(_in_stock=value)