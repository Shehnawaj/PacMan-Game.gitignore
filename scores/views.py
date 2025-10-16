from django.shortcuts import render

# Create your views here.
import json
from django.http import JsonResponse, HttpResponseBadRequest
from .models import HighScore
from django.views.decorators.csrf import csrf_exempt

def index(request):
    return render(request, "index.html")

def Game(request):
    return render(request, "Game.html")

def get_highscores(request):
    top = HighScore.objects.order_by('-score')[:10]
    data = [{"player": h.player_name, "score": h.score, "date": h.created_at.isoformat()} for h in top]
    return JsonResponse({"highscores": data})

@csrf_exempt
def post_highscore(request):
    if request.method != "POST":
        return HttpResponseBadRequest("POST required")
    try:
        payload = json.loads(request.body)
        name = payload.get("player", "Anon")[:32]
        score = int(payload.get("score", 0))
    except Exception:
        return HttpResponseBadRequest("invalid payload")
    h = HighScore.objects.create(player_name=name, score=score)
    return JsonResponse({"id": h.id, "player": h.player_name, "score": h.score})
