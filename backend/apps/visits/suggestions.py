"""Sugerencias de visita B1/B2 a partir de cartera real (sin mock)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Max, Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.core.exceptions import NcError
from apps.accounts.models import Scope
from apps.crm.models import Client, CommercialStatus
from apps.visits.models import PotentialStatus, ProductKind, Visit, VisitProduct, VisitStatus


def _scoped_rtcs(viewer: User):
    qs = User.objects.filter(role__code="RTC", is_active=True)
    scope = viewer.effective_scope
    if scope == Scope.ALL:
        return qs
    if scope == Scope.OWN:
        return qs.filter(id=viewer.id)
    if scope == Scope.ZONE:
        return qs.filter(zone__in=viewer.led_zones.all())
    return qs.filter(id=viewer.id)


def _target_rtc(viewer: User, rtc_id: str | None) -> User:
    if rtc_id:
        rtc = _scoped_rtcs(viewer).filter(id=rtc_id).first()
        if rtc is None and viewer.id == rtc_id:
            rtc = viewer
        if rtc is None:
            raise NcError("resource.not_found", "No encontramos ese comercial.", status=404)
        return rtc
    if viewer.role and viewer.role.code == "RTC":
        return viewer
    raise NcError("visit.rtc_required", "Indica el comercial (rtc_id).", status=400)


def visit_suggestions(viewer: User, rtc_id: str | None = None, limit: int = 15) -> list[dict]:
    rtc = _target_rtc(viewer, rtc_id)
    now = timezone.now()
    clients = Client.objects.filter(
        is_deleted=False,
        owner=rtc,
        commercial_status__in=[CommercialStatus.ACTIVO, CommercialStatus.PROSPECTO],
    ).select_related("zone")

    last_visits = {
        str(row["client_id"]): row["last"]
        for row in Visit.objects.filter(client_id__in=clients.values_list("id", flat=True), is_deleted=False)
        .values("client_id")
        .annotate(last=Max("scheduled_start"))
    }

    pot_by_client = {
        str(row["visit__client_id"]): row["total"] or Decimal("0")
        for row in VisitProduct.objects.filter(
            is_deleted=False,
            kind=ProductKind.POTENCIAL,
            status=PotentialStatus.ABIERTO,
            visit__client_id__in=clients.values_list("id", flat=True),
            visit__is_deleted=False,
        )
        .values("visit__client_id")
        .annotate(total=Sum("total_value"))
    }

    overdue = set(
        str(v)
        for v in Visit.objects.filter(
            rtc=rtc,
            is_deleted=False,
            status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO],
            scheduled_start__lt=now,
        ).values_list("client_id", flat=True)
    )

    scored: list[tuple[int, dict]] = []
    for client in clients:
        cid = str(client.id)
        name = client.trade_name or client.legal_name
        site = client.sites.filter(is_deleted=False, is_primary=True).first() or client.sites.filter(is_deleted=False).first()
        mun = site.municipality.name if site and site.municipality_id else ""
        last = last_visits.get(cid)
        pot = pot_by_client.get(cid, Decimal("0"))
        days_since = None if last is None else max(0, (now.date() - timezone.localtime(last).date()).days)

        band = None
        reason = None
        rank = 0
        if cid in overdue:
            band = "B1"
            reason = "Tiene visita programada atrasada"
            rank = 300
        elif pot >= Decimal("5000000"):
            band = "B1"
            reason = f"Potencial abierto · $ {int(pot):,}".replace(",", ".")
            rank = 250 + int(min(pot / 100000, 50))
        elif last is None or (days_since is not None and days_since >= 30):
            band = "B1" if last is None or (days_since or 0) >= 40 else "B2"
            reason = "Sin visita registrada" if last is None else f"Sin visita hace {days_since} días"
            rank = 200 if band == "B1" else 120
        elif pot >= Decimal("1000000"):
            band = "B2"
            reason = f"Potencial de horizonte · $ {int(pot):,}".replace(",", ".")
            rank = 100 + int(min(pot / 100000, 40))
        else:
            continue

        suggested_day = (now + timedelta(days=1 if band == "B1" else 2)).date().isoformat()
        slot = "MANANA" if rank >= 200 else "TARDE"
        scored.append(
            (
                rank,
                {
                    "client_id": cid,
                    "client_name": name,
                    "municipality": mun,
                    "site_id": str(site.id) if site else None,
                    "reason": reason,
                    "band": band,
                    "tier": band,
                    "suggested_day": suggested_day,
                    "suggested_slot": slot,
                    "potential_value": float(pot) if pot else 0,
                    "days_since_visit": days_since,
                },
            )
        )

    scored.sort(key=lambda x: -x[0])
    return [row for _, row in scored[:limit]]


def rtc_visit_load(viewer: User, rtc_ids: list[str] | None = None) -> list[dict]:
    """Visitas hoy y en la semana ISO actual por RTC (alcance del viewer)."""
    from apps.core.clock import business_today

    today = business_today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)
    rtcs = _scoped_rtcs(viewer)
    if rtc_ids:
        rtcs = rtcs.filter(id__in=rtc_ids)
    results = []
    for rtc in rtcs.select_related("zone").order_by("first_name", "last_name"):
        qs = Visit.objects.filter(rtc=rtc, is_deleted=False).exclude(status=VisitStatus.CANCELADA)
        day_count = qs.filter(scheduled_start__date=today).count()
        week_count = qs.filter(scheduled_start__date__gte=week_start, scheduled_start__date__lt=week_end).count()
        results.append(
            {
                "rtc_id": str(rtc.id),
                "first_name": rtc.first_name,
                "last_name": rtc.last_name,
                "zone_name": rtc.zone.name if rtc.zone_id else "",
                "visits_today": day_count,
                "visits_week": week_count,
                "week_target": 15,
            }
        )
    return results
