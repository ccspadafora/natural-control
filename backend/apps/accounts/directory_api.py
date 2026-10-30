from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.directory import invite_user, list_users, list_zones, reassign_clients, set_active, update_user, update_zone
from apps.accounts.models import Role
from apps.accounts.permissions import requires


def _user_row(user):
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "role": user.role.code,
        "role_name": user.role.name,
        "zone_id": str(user.zone_id) if user.zone_id else None,
        "zone_name": user.zone.name if user.zone_id else "",
        "is_active": user.is_active,
        "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
    }


class UserListView(APIView):
    permission_classes = [requires("users.view")]

    def get(self, request):
        rows = list_users()
        role = request.query_params.get("role")
        if role:
            rows = rows.filter(role__code=role)
        if request.query_params.get("active") == "1":
            rows = rows.filter(is_active=True)
        return Response({"results": [_user_row(user) for user in rows]})

    def post(self, request):
        user = invite_user(request.user, request.data)
        return Response(_user_row(user), status=201)


class UserDetailView(APIView):
    permission_classes = [requires("users.manage")]

    def patch(self, request, user_id):
        return Response(_user_row(update_user(request.user, user_id, request.data)))


class UserActiveView(APIView):
    permission_classes = [requires("users.manage")]

    def post(self, request, user_id, action):
        if action not in {"deactivate", "reactivate"}:
            from apps.core.exceptions import NcError

            raise NcError("resource.not_found", "No encontramos esa acción.", status=404)
        return Response(_user_row(set_active(request.user, user_id, action == "reactivate")))


class RoleListView(APIView):
    permission_classes = [requires("users.view")]

    def get(self, request):
        rows = Role.objects.filter(is_deleted=False).order_by("name")
        return Response({"results": [{"code": role.code, "name": role.name} for role in rows]})


class ZoneListView(APIView):
    permission_classes = [requires("users.view")]

    def get(self, request):
        rows = []
        for zone in list_zones():
            rows.append(
                {
                    "id": str(zone.id),
                    "code": zone.code,
                    "name": zone.name,
                    "gps_tolerance_m": zone.gps_tolerance_m,
                    "municipalities": [{"id": str(town.id), "name": town.name} for town in zone.municipalities.all()],
                }
            )
        return Response({"results": rows})


class ZoneDetailView(APIView):
    permission_classes = [requires("org.manage")]

    def patch(self, request, zone_id):
        zone = update_zone(request.user, zone_id, request.data)
        zone = list_zones().get(id=zone.id)
        return Response(
            {
                "id": str(zone.id),
                "code": zone.code,
                "name": zone.name,
                "gps_tolerance_m": zone.gps_tolerance_m,
                "municipalities": [{"id": str(town.id), "name": town.name} for town in zone.municipalities.all()],
            }
        )


class ClientReassignView(APIView):
    permission_classes = [requires("clients.reassign")]

    def post(self, request):
        moved = reassign_clients(request.user, request.data.get("client_ids") or [], request.data.get("owner_id"))
        return Response({"moved": moved})
