import asyncio

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Scope, User


@database_sync_to_async
def _user(token: str):
    try:
        access = AccessToken(token)
        return User.objects.select_related("role").get(id=access["user_id"], is_active=True)
    except Exception:
        return None


class StreamConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.authed = False
        self.joined: list[str] = []
        await self.accept()
        self._timer = asyncio.get_running_loop().call_later(5, lambda: asyncio.create_task(self._expire()))

    async def _expire(self):
        if not self.authed:
            await self.close(4401)

    async def disconnect(self, code):
        timer = getattr(self, "_timer", None)
        if timer is not None:
            timer.cancel()
        for group in getattr(self, "joined", []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content):
        if self.authed:
            return
        if content.get("type") != "auth":
            await self.close(4401)
            return
        user = await _user(content.get("token") or "")
        if user is None:
            await self.close(4401)
            return
        self.authed = True
        self._timer.cancel()
        groups = [f"user.{user.id}"]
        if user.effective_scope == Scope.ALL:
            groups.append("org.all")
        if user.zone_id:
            groups.append(f"zone.{user.zone_id}")
        for group in groups:
            await self.channel_layer.group_add(group, self.channel_name)
            self.joined.append(group)
        await self.send_json({"type": "ready"})

    async def stream_event(self, message):
        await self.send_json(
            {"type": message["event"], "id": message["id"], "at": message["at"], "data": message["data"]}
        )
