from django.urls import re_path
from _main.proxy import proxy_to_emoty

# Emoty Subdomain (emo.krispc.fr)
urlpatterns = [
    re_path(r"^(?P<path>.*)$", proxy_to_emoty),
]
