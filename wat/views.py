import json
import os

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from _main.settings import MAPBOX_TOKEN;


def index(request):
    """
    Index page
    :param request:
    :type request:
    :return:
    :rtype:
    """
    return render(request, "wat.html")


def mapbox_token(request):
    """
    Get mapbox token from .env
    :param request:
    :type request:
    :return:
    :rtype:
    """
    token = MAPBOX_TOKEN
    return JsonResponse({'token': token})


def contacts_json(request):
    """
    Get contacts from contacts.json
    :param request:
    :type request:
    :return:
    :rtype:
    """
    print("in contacts_json")
    contacts = [{}]

    print("BASE_DIR: ", settings.BASE_DIR)

    file_path = os.path.join(settings.BASE_DIR, 'wat', 'static', 'data', 'contacts.json')
    with open(file_path) as f:
        contacts = json.load(f)

    return JsonResponse({'contacts': contacts})
