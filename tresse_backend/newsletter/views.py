from django.conf import settings
from django.core.mail import send_mail
from django.db import DatabaseError, IntegrityError
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NewsletterSubscriber
from .serializers import NewsletterSubscribeSerializer


class SubscribeAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower().strip()
        source = (serializer.validated_data.get("source") or "unknown").strip()[:32] or "unknown"

        try:
            subscriber, created = NewsletterSubscriber.objects.get_or_create(
                email=email,
                defaults={"source": source, "is_active": True},
            )

            if not created:
                changed = False
                if not subscriber.is_active:
                    subscriber.is_active = True
                    changed = True
                if subscriber.source != source:
                    subscriber.source = source
                    changed = True
                if changed:
                    subscriber.save(update_fields=["is_active", "source", "updated_at"])

        except (IntegrityError, DatabaseError) as e:
            # In DEBUG return useful detail; in prod keep generic
            if settings.DEBUG:
                return Response({"detail": f"DB error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({"detail": "Server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Email (do not break UX if SMTP isn't ready)
        subject = "Welcome to TRESSE"
        message = (
            "You’re subscribed to TRESSE emails.\n\n"
            "You will receive updates about new collections, styling tips and special offers.\n\n"
            "— TRESSE"
        )

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@tresse.com")

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[email],
                fail_silently=not settings.DEBUG,  # in DEBUG you WANT to see errors
            )
        except Exception:
            # Do not block subscription
            pass

        return Response(
            {"ok": True, "created": created, "email": email},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )