from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def comment_list(request):
    if request.method == 'GET':
        comments = [
            {'id': 1, 'text': 'Comments 1'},
            {'id': 2, 'text': 'Comments 2'}
        ]
        return JsonResponse(comments, safe=False)