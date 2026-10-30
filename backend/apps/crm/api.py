from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.catalog.models import Product
from apps.catalog.services import resolve_unit_price
from apps.crm.models import ClientType, CommercialStatus, CropType
from apps.crm.selectors import client_for, clients_for, display_name, is_new, primary_site
from apps.crm.services import create_client
from apps.geo.models import Municipality
from apps.visits.models import Visit, VisitReason, VisitStatus
from apps.visits.services import agenda, open_visits, schedule_visit

STATUS_TONE = {
    CommercialStatus.PROSPECTO: "accent",
    CommercialStatus.ACTIVO: "success",
    CommercialStatus.INACTIVO: "neutral",
    CommercialStatus.PERDIDO: "danger",
}


def _site_payload(site):
    if site is None:
        return None
    point = site.location
    return {
        "id": str(site.id),
        "name": site.name,
        "municipality": site.municipality.name,
        "municipality_id": str(site.municipality_id),
        "latitude": point.y if point else None,
        "longitude": point.x if point else None,
    }


def _client_row(client):
    site = primary_site(client)
    last = (
        Visit.objects.filter(client=client, is_deleted=False, status=VisitStatus.REALIZADA)
        .order_by("-completed_at")
        .values_list("completed_at", flat=True)
        .first()
    )
    return {
        "id": str(client.id),
        "name": display_name(client),
        "legal_name": client.legal_name,
        "municipality": site.municipality.name if site else "",
        "phone": client.phone,
        "status": client.commercial_status,
        "is_new": is_new(client),
        "last_visit_at": last.isoformat() if last else None,
        "owner_id": str(client.owner_id) if client.owner_id else None,
        "owner_name": f"{client.owner.first_name} {client.owner.last_name}".strip() if client.owner_id else "",
        "zone_name": client.zone.name if client.zone_id else "",
    }


class ClientListView(APIView):
    permission_classes = [requires("clients.view")]

    def get(self, request):
        rows = [_client_row(client) for client in clients_for(request.user, request.query_params.get("q", ""))[:200]]
        return Response({"results": rows})

    def post(self, request):
        client = create_client(request.user, request.data)
        return Response(_client_row(client), status=201)


class ClientDetailView(APIView):
    permission_classes = [requires("clients.view")]

    def get(self, request, client_id):
        client = client_for(request.user, client_id)
        sites_qs = client.sites.filter(is_deleted=False).select_related("municipality")
        sites = []
        for site in sites_qs:
            payload = _site_payload(site) or {}
            payload.update(
                {
                    "location_locked": site.location_locked,
                    "location_accuracy_m": site.location_accuracy_m,
                    "total_area_ha": str(site.total_area_ha) if site.total_area_ha is not None else None,
                }
            )
            sites.append(payload)

        crops = []
        for site in sites_qs.prefetch_related("crops__crop_type"):
            for crop in site.crops.filter(is_deleted=False).select_related("crop_type"):
                crops.append(
                    {
                        "id": str(crop.id),
                        "name": crop.crop_type.name,
                        "area_ha": float(crop.area_ha),
                        "phase": crop.phase,
                        "site_id": str(site.id),
                    }
                )

        biotechs = []
        for item in client.biotechs.filter(is_deleted=False).select_related("product"):
            propio = item.product_id is not None
            biotechs.append(
                {
                    "id": str(item.id),
                    "name": item.product.name if propio else item.competitor_product,
                    "origin": "Propio" if propio else "Competencia",
                    "tone": "primary" if propio else "neutral",
                }
            )

        contact = client.contacts.filter(is_deleted=False, is_primary=True).first()
        if contact is None:
            contact = client.contacts.filter(is_deleted=False).first()

        history = []
        visits = (
            Visit.objects.filter(client=client, is_deleted=False)
            .select_related("reason")
            .order_by("-completed_at", "-scheduled_start")[:8]
        )
        months = ("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
        for visit in visits:
            when = visit.completed_at or visit.scheduled_start
            label_when = ""
            if when:
                local = timezone.localtime(when)
                label_when = f"{local.day} {months[local.month - 1]}."
            detail = visit.reason.name if visit.reason_id else visit.get_status_display()
            if visit.result:
                detail = visit.get_result_display()
            history.append({"when": label_when, "text": f"Visita · {detail}"})

        doc = ""
        if client.document_number:
            doc = f"{client.document_type} {client.document_number}"

        return Response(
            {
                **_client_row(client),
                "kind": client.kind,
                "document": doc,
                "document_type": client.document_type,
                "document_number": client.document_number,
                "segment": client.segment,
                "status_label": client.get_commercial_status_display(),
                "status_tone": STATUS_TONE.get(client.commercial_status, "neutral"),
                "client_type": client.client_type.name,
                "price_list": client.price_list.name if client.price_list_id else None,
                "phone": client.phone or (contact.phone if contact else ""),
                "contact_name": contact.full_name if contact else "",
                "whatsapp_opt_in": bool(contact and contact.whatsapp_opt_in),
                "data_consent_at": client.data_consent_at.isoformat() if client.data_consent_at else None,
                "sites": sites,
                "crops": crops,
                "biotechs": biotechs,
                "history": history,
            }
        )


class ClientTypeListView(APIView):
    permission_classes = [requires("clients.view")]

    def get(self, request):
        rows = ClientType.objects.filter(is_deleted=False, is_active=True).order_by("name")
        return Response({"results": [{"id": str(item.id), "name": item.name} for item in rows]})


class CropTypeListView(APIView):
    permission_classes = [requires("clients.view")]

    def get(self, request):
        rows = CropType.objects.filter(is_deleted=False).order_by("name")
        return Response({"results": [{"id": str(item.id), "name": item.name} for item in rows]})


class MunicipalityListView(APIView):
    permission_classes = [requires("clients.view")]

    def get(self, request):
        rows = Municipality.objects.filter(is_deleted=False).select_related("department").order_by("name")
        return Response(
            {
                "results": [
                    {"id": str(item.id), "name": item.name, "department": item.department.name} for item in rows
                ]
            }
        )


class ProductListView(APIView):
    permission_classes = [requires("catalog.view")]

    def get(self, request):
        client = client_for(request.user, request.query_params.get("client"))
        products = Product.objects.filter(is_deleted=False, is_active=True).order_by("name")
        results = []
        for product in products:
            price = resolve_unit_price(client, product)
            results.append(
                {
                    "id": str(product.id),
                    "name": product.name,
                    "presentation": product.presentation,
                    "unit_price": str(price) if price is not None else None,
                }
            )
        return Response({"results": results, "price_list": client.price_list.name if client.price_list_id else None})


class AgendaView(APIView):
    permission_classes = [requires("visits.view")]

    def get(self, request):
        from datetime import datetime

        raw = request.query_params.get("date")
        moment = timezone.now()
        if raw:
            from django.utils.dateparse import parse_date

            parsed = parse_date(raw)
            if parsed:
                moment = timezone.make_aware(datetime(parsed.year, parsed.month, parsed.day, 12, 0), timezone.get_current_timezone())
        view = request.query_params.get("view") or "today"
        today = timezone.localdate()
        results = []
        for visit in agenda(request.user, moment, view):
            when = timezone.localtime(visit.scheduled_start) if visit.scheduled_start else None
            late = bool(when and when.date() < today and visit.status in {VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO})
            results.append(
                {
                    "id": str(visit.id),
                    "client_id": str(visit.client_id),
                    "client_name": visit.client.trade_name or visit.client.legal_name,
                    "municipality": visit.site.municipality.name,
                    "site": visit.site.name,
                    "status": visit.status,
                    "reason": visit.reason.name if visit.reason_id else "",
                    "scheduled_start": when.isoformat() if when else None,
                    "late": late,
                }
            )
        return Response({"results": results})


class VisitCreateView(APIView):
    def get_permissions(self):
        code = "visits.view" if self.request.method == "GET" else "visits.create"
        return [requires(code)()]

    def get(self, request):
        rows = []
        for visit in open_visits(request.user):
            when = timezone.localtime(visit.scheduled_start) if visit.scheduled_start else None
            rows.append(
                {
                    "id": str(visit.id),
                    "client_name": visit.client.trade_name or visit.client.legal_name,
                    "municipality": visit.site.municipality.name,
                    "rtc_id": str(visit.rtc_id),
                    "rtc_name": f"{visit.rtc.first_name} {visit.rtc.last_name}".strip(),
                    "status": visit.status,
                    "origin": visit.origin,
                    "priority": visit.priority,
                    "reason": visit.reason.name if visit.reason_id else "",
                    "scheduled_start": when.isoformat() if when else None,
                }
            )
        return Response({"results": rows})

    def post(self, request):
        visit, warning = schedule_visit(request.user, request.data)
        when = timezone.localtime(visit.scheduled_start)
        return Response(
            {
                "id": str(visit.id),
                "scheduled_start": when.isoformat(),
                "warning": warning,
            },
            status=201,
        )


class VisitReasonListView(APIView):
    permission_classes = [requires("visits.view")]

    def get(self, request):
        rows = VisitReason.objects.filter(is_deleted=False, is_active=True).order_by("name")
        return Response({"results": [{"id": str(item.id), "name": item.name} for item in rows]})
