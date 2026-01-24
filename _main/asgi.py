"""
ASGI config for _main project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

from django.urls import re_path
from .consumers import WebSocketProxyConsumer

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "_main.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter([
                re_path(r"^emo/_next/webpack-hmr$", WebSocketProxyConsumer.as_asgi()),
            ])
        )
    ),
})