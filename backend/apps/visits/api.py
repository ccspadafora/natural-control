from django.utils import timezone
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.scoping import scope_queryset
from apps.visits.evidence import store_photo
from apps.visits.models import GpsCheck, GpsStatus
from apps.visits.services import assign_visit, close_visit, mark_not_done, reassign_visit, register_now, review_check, start_visit, visit_for


def _point(point):
    if point is None:
        return None
    return {"latitude": point.y, "longitude": point.x}


def _check(check: GpsCheck):
    return {
        "id": str(check.id),
        "status": check.status,
        "distance_m": check.distance_m,
        "tolerance_m": check.tolerance_m,
        "accuracy_m": check.accuracy_m,
        "review_status": check.review_status,
        "flags": check.flags,
        "review_note": check.review_note,
        "rtc_justification": check.rtc_justification,
        "position": _point(check.position),
        "reference": _point(check.reference_location),
    }


def _visit(visit, check=None):
    products = [
        {
            "id": str(line.id),
            "product_id": str(line.product_id),
            "name": line.product.name,
            "kind": line.kind,
            "quantity": str(line.quantity),
            "unit_price": str(line.unit_price),
            "total_value": str(line.total_value),
            "horizon": line.horizon,
        }
        for line in visit.products.select_related("product").all()
    ]
    photos = [
        {"id": str(item.id), "url": item.file.url, "thumbnail": item.thumbnail.url if item.thumbnail else item.file.url}
        for item in visit.evidence.filter(is_deleted=False)
    ]
    close = check or visit.gps_checks.filter(kind="CLOSE").order_by("-received_at").first()
    return {
        "id": str(visit.id),
        "client_id": str(visit.client_id),
        "client_name": visit.client.trade_name or visit.client.legal_name,
        "municipality": visit.site.municipality.name,
        "status": visit.status,
        "result": visit.result,
        "notes": visit.notes,
        "agreements": visit.agreements,
        "contact_name_free": visit.contact_name_free,
        "not_done_reason": visit.not_done_reason,
        "products": products,
        "photos": photos,
        "gps_check": _check(close) if close else None,
    }


class VisitDetailView(APIView):
    permission_classes = [requires("visits.view")]

    def get(self, request, visit_id):
        return Response(_visit(visit_for(request.user, visit_id)))


class VisitStartView(APIView):
    permission_classes = [requires("visits.execute")]

    def post(self, request, visit_id):
        visit = start_visit(request.user, visit_id, request.data.get("gps"))
        return Response(_visit(visit))


class VisitCloseView(APIView):
    permission_classes = [requires("visits.execute")]

    def post(self, request, visit_id):
        visit, check = close_visit(request.user, visit_id, request.data)
        return Response(_visit(visit, check))


class VisitNotDoneView(APIView):
    permission_classes = [requires("visits.execute")]

    def post(self, request, visit_id):
        visit, check = mark_not_done(request.user, visit_id, request.data)
        return Response(_visit(visit, check))


class VisitAssignView(APIView):
    permission_classes = [requires("visits.assign")]

    def post(self, request):
        visit, warning = assign_visit(request.user, request.data)
        when = timezone.localtime(visit.scheduled_start)
        return Response(
            {
                "id": str(visit.id),
                "scheduled_start": when.isoformat(),
                "warning": warning,
                "client_name": visit.client.trade_name or visit.client.legal_name,
                "origin": visit.origin,
            },
            status=201,
        )


class VisitReassignView(APIView):
    permission_classes = [requires("visits.assign")]

    def post(self, request, visit_id):
        visit = reassign_visit(request.user, visit_id, request.data.get("rtc_id"))
        return Response({"id": str(visit.id), "rtc_id": str(visit.rtc_id)})


class VisitNowView(APIView):
    permission_classes = [requires("visits.execute")]

    def post(self, request):
        visit = register_now(request.user, request.data.get("client_id"))
        return Response(_visit(visit), status=201)


class EvidenceUploadView(APIView):
    permission_classes = [requires("visits.execute")]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, visit_id):
        visit = visit_for(request.user, visit_id)
        uploaded = request.FILES.get("file")
        if uploaded is None:
            from apps.core.exceptions import NcError

            raise NcError("visit.photos", "Adjunta una foto.", status=400)
        evidence = store_photo(visit, request.user, uploaded)
        return Response(
            {"id": str(evidence.id), "url": evidence.file.url, "thumbnail": evidence.thumbnail.url},
            status=201,
        )


class GpsCheckListView(APIView):
    permission_classes = [requires("gps.review")]

    def get(self, request):
        checks = scope_queryset(
            GpsCheck.objects.filter(is_deleted=False, kind="CLOSE").select_related(
                "visit__client", "visit__rtc", "visit__rtc__zone", "visit__site__municipality"
            ),
            request.user,
            owner_field="visit__rtc",
        )
        pending = checks.filter(review_status="PENDIENTE").count()
        status = request.query_params.get("status")
        if status:
            checks = checks.filter(status=status)
        else:
            checks = checks.exclude(status=GpsStatus.VERIFICADA)
        review = request.query_params.get("review_status")
        if review:
            checks = checks.filter(review_status=review)
        rows = []
        for check in checks.order_by("-received_at")[:200]:
            rows.append(
                {
                    **_check(check),
                    "visit_id": str(check.visit_id),
                    "client_name": check.visit.client.trade_name or check.visit.client.legal_name,
                    "rtc_name": f"{check.visit.rtc.first_name} {check.visit.rtc.last_name}".strip() or check.visit.rtc.email,
                    "municipality": check.visit.site.municipality.name,
                    "site_name": check.visit.site.name,
                    "zone_name": check.visit.rtc.zone.name if check.visit.rtc.zone_id else "",
                    "received_at": check.received_at.isoformat(),
                    "photos": check.visit.evidence.filter(is_deleted=False).count(),
                }
            )
        return Response({"results": rows, "pending": pending})


class GpsReviewView(APIView):
    permission_classes = [requires("gps.review")]

    def post(self, request, check_id):
        check = review_check(request.user, check_id, request.data.get("review_status", ""), request.data.get("note", ""))
        return Response(_check(check))
