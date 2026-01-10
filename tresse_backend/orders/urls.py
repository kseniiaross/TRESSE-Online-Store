from django.urls import path
from .views import CreateOrderAPIView, MyOrdersAPIView, CancelOrderAPIView
from .views_stripe import create_payment_intent, stripe_webhook

urlpatterns = [
    path("", CreateOrderAPIView.as_view(), name="create-order"),          # POST /api/orders/
    path("my/", MyOrdersAPIView.as_view(), name="orders-my"),  
    path("<int:order_id>/cancel/", CancelOrderAPIView.as_view(), name="order-cancel"),           # GET  /api/orders/my/
    path("create-intent/", create_payment_intent, name="create-payment-intent"),  # POST /api/orders/create-intent/
    path("webhook/", stripe_webhook, name="stripe-webhook"),
]