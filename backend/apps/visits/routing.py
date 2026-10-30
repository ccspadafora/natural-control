from django.urls import path

from apps.visits.consumers import StreamConsumer

websocket_urlpatterns = [
    path("ws/v1/stream", StreamConsumer.as_asgi()),
]
