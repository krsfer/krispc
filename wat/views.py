import json
import os

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render

from _main.settings import MAPBOX_TOKEN


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


def update_contacts_json(request):
    print('.')
    print("in update_contacts_json")
    print("request: ", request)
    print("request.body: ", request.body)
    print("request.POST: ", request.POST)
    print("request.GET: ", request.GET)
    print("request.GET.get('coords', None): ", request.GET.get('coords', None))
    print("request.GET.get('name', None): ", request.GET.get('name', None))

    # Decode the byte string to a string
    body_unicode = request.body.decode('utf-8')

    # Load the string as JSON
    body = json.loads(body_unicode)

    # Extract the values
    name = body.get('name', None)
    coords = body.get('coords', None)

    # Get the new coordinates and name from the request
    # new_coords = request.GET.get('coords', None)
    # name = request.GET.get('name', None)

    if coords is None or name is None:
        return JsonResponse({'error': 'Missing name or coords'})

    # Open the contacts.json file and load the existing contacts
    file_path = os.path.join(settings.BASE_DIR, 'wat', 'static', 'data', 'contacts.json')
    with open(file_path, 'r') as f:
        contacts = json.load(f)

    # Find the contact with the given name and update its coordinates
    for contact in contacts:
        if contact['name'] == name:
            contact['coords'] = coords
            break
    else:
        return JsonResponse({'error': 'Contact not found'})

    # Write the updated contacts back to the contacts.json file
    with open(file_path, 'w') as f:
        json.dump(contacts, f)

    return JsonResponse({'success': 'Contact updated'})
