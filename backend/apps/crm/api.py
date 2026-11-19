from django.db.models import Max, Prefetch, Sum
from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.catalog.models import Product
from apps.catalog.services import resolve_unit_price
from apps.crm.models import ClientType, CommercialStatus, CropType, Site
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


def _client_row(client, *, last=None, area=None, site=None):
    site = site if site is not None else primary_site(client)
    if last is None:
        last = (
            Visit.objects.filter(client=client, is_deleted=False, status=VisitStatus.REALIZADA)
            .order_by("-completed_at")
            .values_list("completed_at", flat=True)
            .first()
        )
    if area is None:
        area = None
        for row in client.sites.filter(is_deleted=False).exclude(total_area_ha=None).values_list("total_area_ha", flat=True):
            area = (area or 0) + float(row)
    return {
        "id": str(client.id),
        "name": display_name(client),
        "legal_name": client.legal_name,
        "municipality": site.municipality.name if site and site.municipality_id else "",
        "phone": client.phone,
        "status": client.commercial_status,
        "is_new": is_new(client),
        "last_visit_at": last.isoformat() if last else None,
        "owner_id": str(client.owner_id) if client.owner_id else None,
        "owner_name": f"{client.owner.first_name} {client.owner.last_name}".strip() if client.owner_id else "",
        "zone_name": client.zone.name if client.zone_id else "",
        "client_type": client.client_type.name if client.client_type_id else "",
        "segment": client.segment or "",
        "total_area_ha": area,
    }


def _client_rows(clients):
    """Serializa clientes evitando N+1 en última visita y área."""
    clients = list(clients)
    if not clients:
        return []
    ids = [c.id for c in clients]
    last_map = {
        row["client_id"]: row["last"]
        for row in Visit.objects.filter(client_id__in=ids, is_deleted=False, status=VisitStatus.REALIZADA)
        .values("client_id")
        .annotate(last=Max("completed_at"))
    }
    area_map = {
        row["client_id"]: float(row["area"] or 0)
        for row in Site.objects.filter(client_id__in=ids, is_deleted=False)
        .values("client_id")
        .annotate(area=Sum("total_area_ha"))
    }
    rows = []
    for client in clients:
        sites = list(client.sites.all()) if hasattr(client, "_prefetched_objects_cache") and "sites" in getattr(client, "_prefetched_objects_cache", {}) else None
        site = None
        if sites is not None:
            site = next((s for s in sites if s.is_primary), None) or (sites[0] if sites else None)
        else:
            site = primary_site(client)
        rows.append(
            _client_row(
                client,
                last=last_map.get(client.id),
                area=area_map.get(client.id),
                site=site,
            )
        )
    return rows


class ClientListView(APIView):
    permission_classes = [requires("clients.view")]

    def get(self, request):
        try:
            page = max(1, int(request.query_params.get("page") or 1))
        except ValueError:
            page = 1
        try:
            page_size = min(200, max(10, int(request.query_params.get("page_size") or 25)))
        except ValueError:
            page_size = 25

        qs = clients_for(request.user, request.query_params.get("q", ""))
        status = (request.query_params.get("status") or "").strip().upper()
        if status in CommercialStatus.values:
            qs = qs.filter(commercial_status=status)
        owner = (request.query_params.get("owner") or "").strip()
        if owner == "none":
            qs = qs.filter(owner_id__isnull=True)
        elif owner:
            qs = qs.filter(owner_id=owner)

        total = qs.count()
        start = (page - 1) * page_size
        page_qs = qs.prefetch_related(
            Prefetch(
                "sites",
                queryset=Site.objects.filter(is_deleted=False).select_related("municipality").order_by("-is_primary", "created_at"),
            )
        )[start : start + page_size]
        return Response(
            {
                "results": _client_rows(page_qs),
                "count": total,
                "page": page,
                "page_size": page_size,
            }
        )

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
        client_id = request.query_params.get("client")
        client = client_for(request.user, client_id) if client_id else None
        products = Product.objects.filter(is_deleted=False, is_active=True).order_by("name")
        results = []
        for product in products:
            price = resolve_unit_price(client, product) if client is not None else None
            results.append(
                {
                    "id": str(product.id),
                    "name": product.name,
                    "presentation": product.presentation,
                    "unit_price": str(price) if price is not None else None,
                }
            )
        return Response(
            {
                "results": results,
                "price_list": client.price_list.name if client and client.price_list_id else None,
            }
        )


class AgendaView(APIView):
    permission_classes = [requires("visits.view")]

    def get(self, request):
        from datetime import datetime

        from django.utils.dateparse import parse_date

        def _aware(raw: str | None):
            if not raw:
                return None
            parsed = parse_date(raw)
            if not parsed:
                return None
            return timezone.make_aware(
                datetime(parsed.year, parsed.month, parsed.day, 12, 0),
                timezone.get_current_timezone(),
            )

        moment = _aware(request.query_params.get("date") or request.query_params.get("from")) or timezone.now()
        end_moment = _aware(request.query_params.get("to"))
        view = request.query_params.get("view") or "today"
        if end_moment is not None and view == "today":
            view = "range"
        now = timezone.localtime()
        results = []
        for visit in agenda(request.user, moment, view, end_day=end_moment):
            when = timezone.localtime(visit.scheduled_start) if visit.scheduled_start else None
            # Atrasada = programada y ya pasó la hora (incluye backlog de días previos).
            late = bool(when and when < now and visit.status == VisitStatus.PROGRAMADA)
            late_minutes = int((now - when).total_seconds() // 60) if late and when else 0
            loc = visit.site.location
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
                    "late_minutes": late_minutes,
                    "reschedule_count": visit.reschedule_count or 0,
                    "latitude": loc.y if loc is not None else None,
                    "longitude": loc.x if loc is not None else None,
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
