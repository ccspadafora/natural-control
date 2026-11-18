from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.health import system_health
from apps.accounts.permissions import requires


class AdminHealthView(APIView):
    """HU-17.6 · semáforos operativos + dispositivos con mutaciones pendientes."""

    permission_classes = [requires("admin.supervise")]

    def get(self, request):
        return Response(system_health())
