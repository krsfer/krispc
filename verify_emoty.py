import os
import django
from django.test import Client

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "_main.settings")
django.setup()
from django.conf import settings
settings.ALLOWED_HOSTS += ['testserver']

client = Client()

endpoints = [
    ("/api/emoty/pricelist/", 200),
    ("/api/emoty/services/", 200),
    ("/api/emoty/mcp/", 200),
    ("/api/emoty/swagger/", 200),
    ("/api/emoty/redoc/", 200),
    ("/api/emoty/pricelist/?output=text", 200),
    ("/api/emoty/services/?output=text", 200),
]

from django.urls import resolve, get_resolver
try:
    print("Resolving /api/emoty/pricelist/ ...")
    r = resolve("/api/emoty/pricelist/")
    print(f"Resolved: {r}")
except Exception as e:
    print(f"Resolution Failed: {e}")

print("Checking URL Patterns...")
resolver = get_resolver()
for p in resolver.url_patterns:
    print(f"- {p}")


print("Verifying Emoty Endpoints...")
for url, expected_status in endpoints:
    response = client.get(url)
    print(f"GET {url} : {response.status_code} (Expected {expected_status})")
    if response.status_code != expected_status:
        print(f"FAILED: {url}")
        print(response.content.decode()[:500] + "...")
    else:
        if "output=text" in url:
            if response['Content-Type'] != 'text/plain; charset=utf-8':
                 print(f"FAILED content type for {url}: {response['Content-Type']}")
            else:
                 print("Content-Type OK")
                 print("--- Preview ---")
                 print(response.content.decode()[:100])
                 print("---------------")
        elif "/mcp/" in url:
             import json
             data = json.loads(response.content)
             if data.get("name") == "Emoty MCP Server":
                 print("MCP Content OK")
             else:
                 print("MCP Content FAILED")

print("Verification Complete.")
