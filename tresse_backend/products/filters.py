from django_filters import rest_framework as filters
from django.db.models import Exists, OuterRef
from .models import Product, ProductSize 

class ProductFilter(filters.FilterSet):
    category = filters.CharFilter(method='filter_category')
    available = filters.BooleanFilter(field_name='available')
    in_stock = filters.BooleanFilter(method='filter_in_stock')
    min_price = filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = filters.NumberFilter(field_name='price', lookup_expr='lte')


    class Meta: 
        model = Product
        fields = ['category', 'available', 'in_stock', 'min_price', 'max_price']

    def filter_category(self, qs, name, value):
        if not value:
            return qs
        v = (value or '').strip().lower()
        alias = {
            'woman': 'women',
            'man': 'men',
            'excluseves': 'exclusives',   
        }
        v = alias.get(v, v)
        return qs.filter(category__slug__iexact=v)    

    def filter_in_stock(self, queryset, name, value):
        if value is None:
            return queryset       


        subq=ProductSize.objects.filter(product_id=OuterRef('pk'), quantity__gt=0)
        queryset = queryset.annotate(_has_stock=Exists(subq))
        return queryset.filter(_has_stock=True) if value else queryset.filter(_has_stock=False) 