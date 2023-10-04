from django.shortcuts import render


def index(request):
    return render(request, "wat.html")

# Create your views here.
