import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

django_asgi = get_asgi_application()

from apps.visits.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi,
        "websocket": URLRouter(websocket_urlpatterns),
    }
)
