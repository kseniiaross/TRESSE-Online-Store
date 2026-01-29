from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include


def home(request):
    return HttpResponse("Welcome to the Tresse Backend API!")


urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/comments/", include("comments.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/products/", include("products.urls")),
    path("api/newsletter/", include("newsletter.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)