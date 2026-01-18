import os
from django.shortcuts import render

from .models import Greeting
import requests
from django.http import HttpResponse

# Create your views here.


def index(request):
    return render(request, "index.html")


def db(request):
    # Ensure you have run `./manage.py migrate` to create the database tables.

    greeting = Greeting()
    greeting.save()

    greetings = Greeting.objects.all()

    return render(request, "db.html", {"greetings": greetings})
