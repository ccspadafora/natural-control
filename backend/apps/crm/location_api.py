from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.exceptions import NcError
from apps.core.scoping import scope_queryset
from apps.crm.models import LocationChangeRequest, LocationRequestStatus, LocationSource, Site
from apps.crm.selectors import client_for


def _point(point):
    if point is None:
        return None
    return {"latitude": point.y, "longitude": point.x}


def _row(item: LocationChangeRequest) -> dict:
    site = item.site
    client = site.client
    return {
        "id": str(item.id),
        "status": item.status,
        "reason": item.reason,
        "decision_note": item.decision_note,
        "new_accuracy_m": item.new_accuracy_m,
        "requested_at": item.created_at.isoformat(),
        "decided_at": item.decided_at.isoformat() if item.decided_at else None,
        "requested_by_name": f"{item.requested_by.first_name} {item.requested_by.last_name}".strip(),
        "client_id": str(client.id),
        "client_name": client.trade_name or client.legal_name,
        "site_id": str(site.id),
        "site_name": site.name,
        "municipality": site.municipality.name if site.municipality_id else "",
        "zone_name": client.zone.name if client.zone_id else "",
        "old_location": _point(item.old_location),
        "new_location": _point(item.new_location),
    }


def _scoped_requests(user):
    return scope_queryset(
        LocationChangeRequest.objects.filter(is_deleted=False).select_related(
            "site__municipality",
            "site__client__zone",
            "requested_by",
        ),
        user,
        owner_field="site__client__owner",
    )


class LocationChangeListView(APIView):
    permission_classes = [requires("locations.approve")]

    def get(self, request):
        qs = _scoped_requests(request.user).order_by("-created_at")
        status = request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        else:
            qs = qs.filter(status=LocationRequestStatus.PENDIENTE)
        pending = _scoped_requests(request.user).filter(status=LocationRequestStatus.PENDIENTE).count()
        rows = [_row(item) for item in qs[:100]]
        return Response({"results": rows, "pending": pending})


class LocationChangeCreateView(APIView):
    permission_classes = [requires("clients.edit")]

    def post(self, request):
        site_id = request.data.get("site_id")
        reason = (request.data.get("reason") or "").strip()
        if len(reason) < 5:
            raise NcError("location.reason_required", "Explica por qué hay que mover la sede.", status=400)
        try:
            latitude = float(request.data.get("latitude"))
            longitude = float(request.data.get("longitude"))
        except (TypeError, ValueError) as exc:
            raise NcError("location.invalid", "Marca la nueva ubicación.", status=400) from exc
        site = Site.objects.filter(id=site_id, is_deleted=False).select_related("client", "municipality").first()
        if site is None:
            raise NcError("resource.not_found", "No encontramos esa sede.", status=404)
        client_for(request.user, site.client_id)
        if LocationChangeRequest.objects.filter(
            site=site, status=LocationRequestStatus.PENDIENTE, is_deleted=False
        ).exists():
            raise NcError("location.pending_exists", "Ya hay un cambio de ubicación pendiente para esta sede.", status=409)
        item = LocationChangeRequest.objects.create(
            site=site,
            requested_by=request.user,
            old_location=site.location,
            new_location=Point(longitude, latitude, srid=4326),
            new_accuracy_m=request.data.get("accuracy_m") or None,
            reason=reason,
            created_by=request.user,
            updated_by=request.user,
        )
        return Response(_row(item), status=201)


class LocationChangeDecideView(APIView):
    permission_classes = [requires("locations.approve")]

    @transaction.atomic
    def post(self, request, request_id):
        item = _scoped_requests(request.user).filter(id=request_id).select_related("site").first()
        if item is None:
            raise NcError("resource.not_found", "No encontramos esa solicitud.", status=404)
        if item.status != LocationRequestStatus.PENDIENTE:
            raise NcError("location.already_decided", "Esta solicitud ya fue resuelta.", status=409)
        decision = request.data.get("status")
        note = (request.data.get("decision_note") or "").strip()
        if decision not in {LocationRequestStatus.APROBADA, LocationRequestStatus.RECHAZADA}:
            raise NcError("location.invalid", "Indica si apruebas o rechazas.", status=400)
        if decision == LocationRequestStatus.RECHAZADA and len(note) < 3:
            raise NcError("location.note_required", "Escribe por qué rechazas el cambio.", status=400)

        now = timezone.now()
        item.status = decision
        item.decided_by = request.user
        item.decided_at = now
        item.decision_note = note
        item.updated_by = request.user
        item.save(
            update_fields=[
                "status",
                "decided_by",
                "decided_at",
                "decision_note",
                "updated_by",
                "updated_at",
            ]
        )

        if decision == LocationRequestStatus.APROBADA:
            site = item.site
            site.location = item.new_location
            site.location_accuracy_m = item.new_accuracy_m
            site.location_source = LocationSource.MAP_PIN
            site.location_set_by = request.user
            site.location_set_at = now
            site.location_locked = True
            site.updated_by = request.user
            site.save(
                update_fields=[
                    "location",
                    "location_accuracy_m",
                    "location_source",
                    "location_set_by",
                    "location_set_at",
                    "location_locked",
                    "updated_by",
                    "updated_at",
                ]
            )

        return Response(_row(item))
