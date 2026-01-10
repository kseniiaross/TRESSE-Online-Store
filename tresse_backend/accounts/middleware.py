from django.http import JsonResponse, HttpResponse
from django.contrib.auth.models import AnonymousUser
from django.shortcuts import redirect

class AuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == '/favicon.ico':
            return HttpResponse(status=204) 
        if hasattr(request, 'user') and isinstance(request.user, AnonymousUser):
            if request.path.startswith('/api/register') or \
                request.path.startswith('/api/login') or \
                request.path.startswith('/api/products') or \
                request.path.startswith('/api/reviews'):
                return self.get_response(request)
        

            if request.path.startswith('/api/comments/'): 
                return JsonResponse({"error":"User is not authenticated"}, status=401)

        response = self.get_response(request) 
        return response 
        
                