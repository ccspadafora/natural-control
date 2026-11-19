"""Consolidado de visitas en vivo / centro de mando para Consola."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.core.clock import business_today
from apps.core.scoping import scope_queryset
from apps.visits.models import Evidence, GpsCheck, GpsKind, ProductKind, Visit, VisitProduct, VisitStatus

BOGOTA = ZoneInfo("America/Bogota")
PAGE_SIZE = 80
BACKLOG_DAYS = 45


def _point(point):
    if point is None:
        return None
    return {"latitude": point.y, "longitude": point.x}


def live_visits(user, *, day=None, status=None, zone=None, rtc=None, page: int = 1, board: bool = True) -> dict:
    """Lista visitas del día + backlog abierto reciente (modo centro de mando)."""
    today = day or business_today()
    day_start = datetime(today.year, today.month, today.day, tzinfo=BOGOTA)
    day_end = day_start + timedelta(days=1)
    now = timezone.now()

    base = scope_queryset(
        Visit.objects.filter(is_deleted=False)
        .exclude(status=VisitStatus.CANCELADA)
        .select_related("client", "site", "site__municipality", "rtc", "rtc__zone", "reason"),
        user,
        owner_field="rtc",
    )

    if board:
        # Hoy + abiertas de los últimos BACKLOG_DAYS (evita escanear años de atrasadas).
        backlog_start = day_start - timedelta(days=BACKLOG_DAYS)
        qs = base.filter(
            Q(scheduled_start__gte=day_start, scheduled_start__lt=day_end)
            | Q(
                status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO],
                scheduled_start__gte=backlog_start,
                scheduled_start__lt=day_end,
            )
        )
    else:
        qs = base.filter(scheduled_start__gte=day_start, scheduled_start__lt=day_end)

    if status:
        qs = qs.filter(status=status)
    if zone:
        qs = qs.filter(rtc__zone_id=zone)
    if rtc:
        qs = qs.filter(rtc_id=rtc)

    summary_row = qs.aggregate(
        total=Count("id"),
        en_curso=Count("id", filter=Q(status=VisitStatus.EN_CURSO)),
        realizadas=Count("id", filter=Q(status=VisitStatus.REALIZADA)),
        no_realizadas=Count("id", filter=Q(status=VisitStatus.NO_REALIZADA)),
        atrasadas=Count("id", filter=Q(status=VisitStatus.PROGRAMADA, scheduled_start__lt=now)),
        programadas=Count("id", filter=Q(status=VisitStatus.PROGRAMADA, scheduled_start__gte=now)),
    )
    total = int(summary_row["total"] or 0)

    page = max(1, page)
    offset = (page - 1) * PAGE_SIZE
    page_ids = list(qs.order_by("scheduled_start").values_list("id", flat=True)[offset : offset + PAGE_SIZE])

    rows = list(
        Visit.objects.filter(id__in=page_ids)
        .select_related("client", "site", "site__municipality", "rtc", "rtc__zone", "reason")
        .prefetch_related(
            Prefetch(
                "products",
                queryset=VisitProduct.objects.filter(is_deleted=False).only("id", "visit_id", "kind", "total_value"),
            ),
            Prefetch(
                "gps_checks",
                queryset=GpsCheck.objects.filter(is_deleted=False, kind=GpsKind.CLOSE).order_by("-received_at"),
            ),
            Prefetch(
                "evidence",
                queryset=Evidence.objects.filter(is_deleted=False).only("id", "visit_id", "is_deleted"),
            ),
        )
    )
    by_id = {v.id: v for v in rows}
    ordered = [by_id[i] for i in page_ids if i in by_id]
    ordered.sort(
        key=lambda v: (
            0 if (v.status == VisitStatus.PROGRAMADA and v.scheduled_start and v.scheduled_start < now) else 1,
            0 if v.status == VisitStatus.EN_CURSO else 1,
            v.scheduled_start or now,
        )
    )

    results = []
    for visit in ordered:
        close = next((c for c in visit.gps_checks.all()), None)
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
            gps = {
                "status": close.status,
                "distance_m": close.distance_m,
                "review_status": close.review_status,
            }
        photos = len(visit.evidence.all())
        when = visit.scheduled_start
        late = bool(when and when < now and visit.status == VisitStatus.PROGRAMADA)
        late_minutes = int((now - when).total_seconds() // 60) if late and when else 0
        results.append(
            {
                "id": str(visit.id),
                "scheduled_start": when.isoformat() if when else None,
                "client_id": str(visit.client_id),
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
                "late": late,
                "late_minutes": late_minutes,
            }
        )

    # GPS verificado solo del día (barato) — no del backlog completo.
    day_gps = qs.filter(
        scheduled_start__gte=day_start,
        scheduled_start__lt=day_end,
        gps_checks__kind=GpsKind.CLOSE,
        gps_checks__is_deleted=False,
    )
    gps_total = day_gps.distinct().count()
    verified_total = day_gps.filter(gps_checks__status="VERIFICADA").distinct().count() if gps_total else 0

    return {
        "results": results,
        "count": total,
        "page": page,
        "page_size": PAGE_SIZE,
        "summary": {
            "total": total,
            "en_curso": int(summary_row["en_curso"] or 0),
            "realizadas": int(summary_row["realizadas"] or 0),
            "no_realizadas": int(summary_row["no_realizadas"] or 0),
            "atrasadas": int(summary_row["atrasadas"] or 0),
            "programadas": int(summary_row["programadas"] or 0),
            "verificadas_pct": round(100.0 * verified_total / gps_total, 1) if gps_total else None,
        },
    }


def parse_live_date(raw: str | None):
    if not raw:
        return business_today()
    parsed = parse_date(raw)
    return parsed or business_today()
