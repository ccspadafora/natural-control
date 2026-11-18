"""Consolidado de visitas en vivo para Consola."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db.models import Prefetch
from django.utils.dateparse import parse_date

from apps.core.clock import business_today
from apps.core.scoping import scope_queryset
from apps.visits.models import GpsKind, ProductKind, Visit, VisitProduct, VisitStatus

BOGOTA = ZoneInfo("America/Bogota")
PAGE_SIZE = 50


def _point(point):
    if point is None:
        return None
    return {"latitude": point.y, "longitude": point.x}


def live_visits(user, *, day=None, status=None, zone=None, rtc=None, page: int = 1) -> dict:
    today = day or business_today()
    day_start = datetime(today.year, today.month, today.day, tzinfo=BOGOTA)
    day_end = day_start + timedelta(days=1)

    qs = scope_queryset(
        Visit.objects.filter(is_deleted=False, scheduled_start__gte=day_start, scheduled_start__lt=day_end)
        .exclude(status=VisitStatus.CANCELADA)
        .select_related("client", "site", "site__municipality", "rtc", "rtc__zone", "reason")
        .prefetch_related(
            Prefetch(
                "products",
                queryset=VisitProduct.objects.filter(is_deleted=False).select_related("product"),
            ),
            "gps_checks",
            "evidence",
        ),
        user,
        owner_field="rtc",
    )
    if status:
        qs = qs.filter(status=status)
    if zone:
        qs = qs.filter(rtc__zone_id=zone)
    if rtc:
        qs = qs.filter(rtc_id=rtc)

    total = qs.count()
    en_curso = qs.filter(status=VisitStatus.EN_CURSO).count()
    realizadas = qs.filter(status=VisitStatus.REALIZADA).count()
    no_realizadas = qs.filter(status=VisitStatus.NO_REALIZADA).count()

    page = max(1, page)
    offset = (page - 1) * PAGE_SIZE
    rows = list(qs.order_by("scheduled_start")[offset : offset + PAGE_SIZE])

    results = []
    verified = 0
    with_gps = 0
    for visit in rows:
        close = next((c for c in visit.gps_checks.all() if c.kind == GpsKind.CLOSE and not c.is_deleted), None)
        if close is None:
            close = visit.gps_checks.filter(kind=GpsKind.CLOSE, is_deleted=False).order_by("-received_at").first()
        concretado = sum(
            (Decimal(str(p.total_value)) for p in visit.products.all() if p.kind == ProductKind.CONCRETADO),
            Decimal("0"),
        )
        potencial = sum(
            (Decimal(str(p.total_value)) for p in visit.products.all() if p.kind == ProductKind.POTENCIAL),
            Decimal("0"),
        )
        position = _point(close.position) if close and close.position else _point(visit.site.location)
        gps = None
        if close:
            with_gps += 1
            if close.status == "VERIFICADA":
                verified += 1
            gps = {
                "status": close.status,
                "distance_m": close.distance_m,
                "review_status": close.review_status,
            }
        photos = sum(1 for e in visit.evidence.all() if not e.is_deleted)
        when = visit.scheduled_start
        results.append(
            {
                "id": str(visit.id),
                "scheduled_start": when.isoformat() if when else None,
                "client_name": visit.client.trade_name or visit.client.legal_name,
                "site": visit.site.name,
                "municipality": visit.site.municipality.name if visit.site.municipality_id else "",
                "rtc_id": str(visit.rtc_id),
                "rtc_name": f"{visit.rtc.first_name} {visit.rtc.last_name}".strip() or visit.rtc.email,
                "zone": visit.rtc.zone.name if visit.rtc.zone_id else "",
                "zone_id": str(visit.rtc.zone_id) if visit.rtc.zone_id else None,
                "status": visit.status,
                "result": visit.result,
                "reason": visit.reason.name if visit.reason_id else "",
                "gps": gps,
                "position": position,
                "concretado": float(concretado),
                "potencial": float(potencial),
                "photos": photos,
            }
        )

    # summary counts over full filtered set (not just page) for verified
    all_gps = (
        scope_queryset(
            Visit.objects.filter(is_deleted=False, scheduled_start__gte=day_start, scheduled_start__lt=day_end)
            .exclude(status=VisitStatus.CANCELADA),
            user,
            owner_field="rtc",
        )
        .filter(gps_checks__kind=GpsKind.CLOSE, gps_checks__is_deleted=False)
        .distinct()
    )
    if status:
        all_gps = all_gps.filter(status=status)
    verified_total = all_gps.filter(gps_checks__status="VERIFICADA").distinct().count()
    gps_total = all_gps.count()

    return {
        "results": results,
        "count": total,
        "page": page,
        "page_size": PAGE_SIZE,
        "summary": {
            "total": total,
            "en_curso": en_curso,
            "realizadas": realizadas,
            "no_realizadas": no_realizadas,
            "verificadas_pct": round(100.0 * verified_total / gps_total, 1) if gps_total else None,
        },
    }


def parse_live_date(raw: str | None):
    if not raw:
        return business_today()
    parsed = parse_date(raw)
    return parsed or business_today()
