from uuid import UUID

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Device
from apps.accounts.permissions import requires
from apps.core.exceptions import NcError


def _device_row(device: Device) -> dict:
    return {
        "id": str(device.id),
        "user_id": str(device.user_id),
        "label": device.label,
        "platform": device.platform,
        "last_used_at": device.last_used_at.isoformat() if device.last_used_at else None,
        "revoked_at": device.revoked_at.isoformat() if device.revoked_at else None,
        "pending_mutations": device.pending_mutations,
    }


class DeviceListView(APIView):
    permission_classes = [requires("users.manage")]

    def get(self, request):
        rows = (
            Device.objects.filter(is_deleted=False, revoked_at__isnull=True)
            .select_related("user")
            .order_by("-last_used_at", "-created_at")[:200]
        )
        return Response({"results": [_device_row(item) for item in rows]})


class DeviceRevokeView(APIView):
    permission_classes = [requires("users.manage")]

    def post(self, request, device_id: UUID):
        device = Device.objects.filter(id=device_id, is_deleted=False, revoked_at__isnull=True).first()
        if device is None:
            raise NcError("resource.not_found", "Dispositivo no encontrado.", status=404)
        device.revoked_at = timezone.now()
        device.revoked_by = request.user
        device.save(update_fields=["revoked_at", "revoked_by", "updated_at"])
        return Response(_device_row(device))
