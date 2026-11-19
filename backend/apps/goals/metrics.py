"""Selectores de métricas de equipo y zonas para Consola Gerencia / Líder."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum

from apps.accounts.models import Scope
from apps.core.clock import business_now, business_today
from apps.core.prototipo.data import PROTO_ZONES
from apps.crm.models import Client
from apps.goals.models import Goal, PeriodType, ScorecardSnapshot
from apps.org.models import Zone
from apps.visits.models import GpsCheck, ReviewStatus, Visit, VisitStatus, WeeklyPlan, WeeklyPlanStatus

User = get_user_model()
BOGOTA = ZoneInfo("America/Bogota")

ZONE_DEPS = {row["code"]: row.get("deps") or [] for row in PROTO_ZONES}


def scoped_rtcs(user):
    qs = User.objects.filter(role__code="RTC", is_active=True, is_deleted=False).select_related("zone", "role")
    scope = user.effective_scope
    if scope == Scope.ALL:
        return qs
    if scope == Scope.ZONE:
        return qs.filter(zone__in=user.led_zones.all())
    if scope == Scope.OWN:
        return qs.filter(id=user.id)
    return qs.none()


def _period_start(today: date, period: str) -> date:
    if period == "semana":
        return today - timedelta(days=today.weekday())
    if period == "dia":
        return today
    if period == "anio":
        return date(today.year, 1, 1)
    return date(today.year, today.month, 1)


def _period_progress(today: date, period: str) -> tuple[int, int]:
    """(día del período, días totales del período) para D1/prorrateo de meta."""
    if period == "dia":
        return 1, 1
    if period == "semana":
        return today.weekday() + 1, 7
    if period == "anio":
        days = 366 if (today.year % 4 == 0 and (today.year % 100 != 0 or today.year % 400 == 0)) else 365
        return today.timetuple().tm_yday, days
    days_in_month = monthrange(today.year, today.month)[1]
    return today.day, days_in_month


def _month_start(today: date) -> date:
    return date(today.year, today.month, 1)


def _snapshot_for(user_id, period_start: date) -> ScorecardSnapshot | None:
    return (
        ScorecardSnapshot.objects.filter(user_id=user_id, period_start=period_start, is_deleted=False).first()
        or ScorecardSnapshot.objects.filter(user_id=user_id, is_deleted=False).order_by("-period_start").first()
    )


def _goal_for(user_id, period_start: date) -> Goal | None:
    return (
        Goal.objects.filter(
            user_id=user_id, period_type=PeriodType.MES, period_start=period_start, is_deleted=False
        ).first()
        or Goal.objects.filter(user_id=user_id, period_type=PeriodType.MES, is_deleted=False)
        .order_by("-period_start")
        .first()
    )


def _scale_monthly(amount: float, period: str, days_in_month: int) -> float:
    """Prorratea meta mensual al período seleccionado."""
    if amount <= 0:
        return 0.0
    if period == "dia":
        return amount / max(days_in_month, 1)
    if period == "semana":
        return amount * (7 / max(days_in_month, 1))
    if period == "anio":
        return amount * 12
    return amount


def _d1_pct(sales: float, budget: float, day: int, days_in_period: int) -> float | None:
    if budget <= 0 or days_in_period <= 0:
        return None
    expected = budget * (day / days_in_period)
    if expected <= 0:
        return None
    return round(100.0 * sales / expected, 1)


def _tone(d1: float | None) -> str:
    if d1 is None:
        return "warning"
    if d1 >= 85:
        return "success"
    if d1 >= 70:
        return "warning"
    return "danger"


def team_metrics(user, period: str = "mes") -> dict:
    from apps.visits.models import ProductKind, VisitProduct

    today = business_today()
    now = business_now()
    period = period if period in {"mes", "semana", "dia", "anio"} else "mes"
    period_start = _period_start(today, period)
    month_start = _month_start(today)
    days_in_month = monthrange(today.year, today.month)[1]
    day, days_in_period = _period_progress(today, period)
    rtcs = list(scoped_rtcs(user))
    rtc_ids = [r.id for r in rtcs]

    day_start = datetime(today.year, today.month, today.day, tzinfo=BOGOTA)
    day_end = day_start + timedelta(days=1)
    period_start_dt = datetime(period_start.year, period_start.month, period_start.day, tzinfo=BOGOTA)
    period_end_dt = day_end

    visits_today = Visit.objects.filter(
        rtc_id__in=rtc_ids, is_deleted=False, scheduled_start__gte=day_start, scheduled_start__lt=day_end
    )
    day_counts = {
        row["rtc_id"]: row
        for row in visits_today.values("rtc_id").annotate(
            programadas=Count("id", filter=Q(status=VisitStatus.PROGRAMADA)),
            realizadas=Count("id", filter=Q(status=VisitStatus.REALIZADA)),
            pendientes=Count("id", filter=Q(status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO])),
            no_realizadas=Count("id", filter=Q(status=VisitStatus.NO_REALIZADA)),
            en_curso=Count("id", filter=Q(status=VisitStatus.EN_CURSO)),
        )
    }

    in_period = Q(visit__completed_at__gte=period_start_dt, visit__completed_at__lt=period_end_dt) | Q(
        visit__completed_at__isnull=True,
        visit__scheduled_start__gte=period_start_dt,
        visit__scheduled_start__lt=period_end_dt,
    )
    visit_in_period = Q(completed_at__gte=period_start_dt, completed_at__lt=period_end_dt) | Q(
        completed_at__isnull=True,
        scheduled_start__gte=period_start_dt,
        scheduled_start__lt=period_end_dt,
    )

    # Ventas y visitas reales del período (para que Mes/Semana/Día/Año cambien cifras).
    sales_by_rtc = {
        row["visit__rtc_id"]: float(row["total"] or 0)
        for row in VisitProduct.objects.filter(
            visit__rtc_id__in=rtc_ids,
            visit__is_deleted=False,
            is_deleted=False,
            kind=ProductKind.CONCRETADO,
        )
        .filter(in_period)
        .values("visit__rtc_id")
        .annotate(total=Sum("total_value"))
    }
    pot_by_rtc = {
        row["visit__rtc_id"]: float(row["total"] or 0)
        for row in VisitProduct.objects.filter(
            visit__rtc_id__in=rtc_ids,
            visit__is_deleted=False,
            is_deleted=False,
            kind=ProductKind.POTENCIAL,
        )
        .filter(in_period)
        .values("visit__rtc_id")
        .annotate(total=Sum("total_value"))
    }
    visits_by_rtc = {
        row["rtc_id"]: int(row["done"] or 0)
        for row in Visit.objects.filter(
            rtc_id__in=rtc_ids,
            is_deleted=False,
            status=VisitStatus.REALIZADA,
        )
        .filter(visit_in_period)
        .values("rtc_id")
        .annotate(done=Count("id"))
    }
    gps_by_rtc = {
        row["visit__rtc_id"]: row
        for row in GpsCheck.objects.filter(
            is_deleted=False,
            kind="CLOSE",
            visit__rtc_id__in=rtc_ids,
            visit__is_deleted=False,
            received_at__gte=period_start_dt,
            received_at__lt=period_end_dt,
        )
        .values("visit__rtc_id")
        .annotate(total=Count("id"), verified=Count("id", filter=Q(status="VERIFICADA")))
    }

    rows = []
    total_sales = 0.0
    total_budget = 0.0
    total_visits_done = 0
    total_visits_target = 0
    verified_acc = 0.0
    verified_n = 0
    pot_acc = 0.0

    for rtc in rtcs:
        snap = _snapshot_for(rtc.id, month_start)
        goal = _goal_for(rtc.id, month_start)
        attrs = (snap.attributes if snap else {}) or {}
        monthly_budget = float(goal.sales_budget) if goal else 0.0
        monthly_visits_target = int(goal.visits_target) if goal else 0
        budget = _scale_monthly(monthly_budget, period, days_in_month)
        visits_target = int(round(_scale_monthly(float(monthly_visits_target), period, days_in_month)))
        # Período mes: preferir snapshot si existe; si no, datos vivos.
        if period == "mes" and snap is not None:
            sales = float(attrs.get("sales") or sales_by_rtc.get(rtc.id) or 0)
            visits_done = int(attrs.get("visits") or visits_by_rtc.get(rtc.id) or 0)
            verified_pct = attrs.get("verif")
            coverage_pct = attrs.get("cob")
            pot_acc += float(attrs.get("pot") or pot_by_rtc.get(rtc.id) or 0)
        else:
            sales = float(sales_by_rtc.get(rtc.id) or 0)
            visits_done = int(visits_by_rtc.get(rtc.id) or 0)
            gps_row = gps_by_rtc.get(rtc.id) or {}
            gps_total = int(gps_row.get("total") or 0)
            verified_pct = round(100.0 * int(gps_row.get("verified") or 0) / gps_total, 1) if gps_total else None
            coverage_pct = attrs.get("cob")
            pot_acc += float(pot_by_rtc.get(rtc.id) or 0)
        expected = budget * (day / days_in_period) if budget and days_in_period else 0.0
        d1 = _d1_pct(sales, budget, day, days_in_period)
        d2 = round(100.0 * sales / budget, 1) if budget else None
        day_row = day_counts.get(rtc.id) or {}
        total_sales += sales
        total_budget += budget
        total_visits_done += visits_done
        total_visits_target += visits_target
        if verified_pct is not None:
            verified_acc += float(verified_pct)
            verified_n += 1
        rows.append(
            {
                "id": str(rtc.id),
                "name": f"{rtc.first_name} {rtc.last_name}".strip() or rtc.email,
                "zone": rtc.zone.name if rtc.zone_id else "",
                "zone_id": str(rtc.zone_id) if rtc.zone_id else None,
                "sales": sales,
                "budget": budget,
                "expected": expected,
                "d1_pct": d1,
                "d2_pct": d2,
                "visits_done": visits_done,
                "visits_target": visits_target,
                "verified_pct": verified_pct,
                "coverage_pct": coverage_pct,
                "last_sync_at": rtc.last_sync_at.isoformat() if rtc.last_sync_at else None,
                "gen": snap.gen if snap else None,
                "day": {
                    "programadas": int(day_row.get("programadas") or 0)
                    + int(day_row.get("realizadas") or 0)
                    + int(day_row.get("no_realizadas") or 0)
                    + int(day_row.get("en_curso") or 0),
                    "realizadas": int(day_row.get("realizadas") or 0),
                    "pendientes": int(day_row.get("pendientes") or 0),
                    "no_realizadas": int(day_row.get("no_realizadas") or 0),
                },
            }
        )

    # Atención
    gps_pending = GpsCheck.objects.filter(
        is_deleted=False,
        kind="CLOSE",
        review_status=ReviewStatus.PENDIENTE,
        visit__rtc_id__in=rtc_ids,
    ).count()
    plans_pending = WeeklyPlan.objects.filter(
        is_deleted=False,
        status=WeeklyPlanStatus.ENVIADA,
        rtc_id__in=rtc_ids,
    ).count()
    visits_not_started = Visit.objects.filter(
        rtc_id__in=rtc_ids,
        is_deleted=False,
        status=VisitStatus.PROGRAMADA,
        scheduled_start__lt=now,
        scheduled_start__gte=day_start,
    ).count()
    stale_cutoff = today - timedelta(days=30)
    clients_in_scope = Client.objects.filter(owner_id__in=rtc_ids, is_deleted=False)
    visited_ids = (
        Visit.objects.filter(
            rtc_id__in=rtc_ids,
            is_deleted=False,
            status=VisitStatus.REALIZADA,
            completed_at__date__gte=stale_cutoff,
        )
        .values_list("client_id", flat=True)
        .distinct()
    )
    clients_stale = clients_in_scope.exclude(id__in=visited_ids).count()

    product_rows = (
        VisitProduct.objects.filter(
            visit__rtc_id__in=rtc_ids,
            is_deleted=False,
            visit__is_deleted=False,
        )
        .filter(in_period)
        .values("product_id", "product__name", "product__category__name", "product__active_ingredient")
        .annotate(
            potential=Sum("total_value", filter=Q(kind=ProductKind.POTENCIAL)),
            concretado=Sum("total_value", filter=Q(kind=ProductKind.CONCRETADO)),
        )
        .order_by("-potential")[:20]
    )
    products = []
    for row in product_rows:
        pot = float(row["potential"] or 0)
        conc = float(row["concretado"] or 0)
        products.append(
            {
                "id": str(row["product_id"]),
                "name": row["product__name"],
                "category": row["product__category__name"] or "",
                "active_ingredient": row["product__active_ingredient"] or "",
                "potential": pot,
                "concretado": conc,
                "conversion": round(100.0 * conc / pot, 1) if pot else (100.0 if conc else None),
            }
        )

    expected_total = total_budget * (day / days_in_period) if total_budget and days_in_period else 0.0
    forecast_probable = pot_acc * 0.62

    return {
        "period": period,
        "period_start": period_start.isoformat(),
        "day": day,
        "days_in_month": days_in_period,
        "totals": {
            "sales": total_sales,
            "budget": total_budget,
            "expected": expected_total,
            "visits_done": total_visits_done,
            "visits_target": total_visits_target,
            "gps_verified_pct": round(verified_acc / verified_n, 1) if verified_n else None,
            "forecast_probable": forecast_probable,
        },
        "rtcs": rows,
        "attention": {
            "gps_pending": gps_pending,
            "plans_pending": plans_pending,
            "visits_not_started": visits_not_started,
            "clients_stale_30d": clients_stale,
        },
        "products": products,
    }


def zone_metrics(user) -> dict:
    today = business_today()
    days_in_month = monthrange(today.year, today.month)[1]
    day = today.day
    period_start = date(today.year, today.month, 1)
    rtcs = list(scoped_rtcs(user).select_related("zone"))
    by_zone: dict = {}
    for rtc in rtcs:
        if not rtc.zone_id:
            continue
        zone = rtc.zone
        bucket = by_zone.setdefault(
            zone.id,
            {
                "zone": zone,
                "rtcs": [],
                "sales": 0.0,
                "budget": 0.0,
                "visits_done": 0,
                "visits_target": 0,
                "coverage_acc": 0.0,
                "coverage_n": 0,
            },
        )
        snap = _snapshot_for(rtc.id, period_start)
        goal = _goal_for(rtc.id, period_start)
        attrs = (snap.attributes if snap else {}) or {}
        bucket["rtcs"].append(rtc)
        bucket["sales"] += float(attrs.get("sales") or 0)
        bucket["budget"] += float(goal.sales_budget) if goal else 0.0
        bucket["visits_done"] += int(attrs.get("visits") or 0)
        bucket["visits_target"] += int(goal.visits_target) if goal else 0
        if attrs.get("cob") is not None:
            bucket["coverage_acc"] += float(attrs["cob"])
            bucket["coverage_n"] += 1

    # Si el alcance es ALL, incluir zonas sin RTC en el seed
    if user.effective_scope == Scope.ALL:
        for zone in Zone.objects.filter(is_deleted=False):
            by_zone.setdefault(
                zone.id,
                {
                    "zone": zone,
                    "rtcs": [],
                    "sales": 0.0,
                    "budget": 0.0,
                    "visits_done": 0,
                    "visits_target": 0,
                    "coverage_acc": 0.0,
                    "coverage_n": 0,
                },
            )

    zones_out = []
    for bucket in by_zone.values():
        zone = bucket["zone"]
        d1 = _d1_pct(bucket["sales"], bucket["budget"], day, days_in_month)
        d2 = round(100.0 * bucket["sales"] / bucket["budget"], 1) if bucket["budget"] else None
        visits_pct = (
            round(100.0 * bucket["visits_done"] / bucket["visits_target"], 1) if bucket["visits_target"] else None
        )
        leaders = list(zone.leaders.filter(is_active=True).values_list("first_name", "last_name")[:1])
        leader_name = " ".join(leaders[0]).strip() if leaders else ""
        zones_out.append(
            {
                "id": str(zone.id),
                "code": zone.code,
                "name": zone.name,
                "leader": leader_name,
                "rtc_count": len(bucket["rtcs"]),
                "municipality_count": zone.municipalities.count(),
                "departments": ZONE_DEPS.get(zone.code, []),
                "sales": bucket["sales"],
                "budget": bucket["budget"],
                "d1_pct": d1,
                "d2_pct": d2,
                "visits_pct": visits_pct,
                "coverage_pct": round(bucket["coverage_acc"] / bucket["coverage_n"], 1)
                if bucket["coverage_n"]
                else None,
                "tone": _tone(d1),
            }
        )
    zones_out.sort(key=lambda z: z["name"])
    return {"results": zones_out}


def rtc_detail(viewer, rtc_id: str) -> dict:
    """Drill-down real: serie diaria 14 días + breakdown de resultados."""
    rtc = scoped_rtcs(viewer).filter(id=rtc_id).first()
    if rtc is None:
        from apps.core.exceptions import NcError

        raise NcError("resource.not_found", "No encontramos ese comercial.", status=404)

    today = business_today()
    start = today - timedelta(days=13)
    visits = Visit.objects.filter(rtc=rtc, is_deleted=False, scheduled_start__date__gte=start, scheduled_start__date__lte=today)
    daily = []
    for i in range(14):
        day = start + timedelta(days=i)
        day_qs = visits.filter(scheduled_start__date=day)
        prog = day_qs.count()
        done = day_qs.filter(status=VisitStatus.REALIZADA).count()
        daily.append({"date": day.isoformat(), "prog": prog, "done": done})

    closed = Visit.objects.filter(
        rtc=rtc,
        is_deleted=False,
        status=VisitStatus.REALIZADA,
        completed_at__date__gte=date(today.year, today.month, 1),
    )
    total_closed = closed.count() or 1
    result_counts = (
        closed.values("result")
        .annotate(n=Count("id"))
        .order_by("-n")
    )
    labels = {
        "PEDIDO_CONFIRMADO": "Pedido confirmado",
        "COTIZACION_SOLICITADA": "Cotización solicitada",
        "SEGUIMIENTO": "Seguimiento programado",
        "SIN_INTERES": "Sin interés",
        "OTRO": "Otro",
    }
    results = []
    for row in result_counts:
        key = row["result"] or "OTRO"
        results.append(
            {
                "result": key,
                "label": labels.get(key, key),
                "count": row["n"],
                "pct": round(100.0 * row["n"] / total_closed, 1),
            }
        )

    commercial = closed.filter(
        result__in=["PEDIDO_CONFIRMADO", "COTIZACION_SOLICITADA", "SEGUIMIENTO"]
    ).count()
    effectiveness = round(100.0 * commercial / total_closed, 1) if closed.count() else None

    return {
        "rtc_id": str(rtc.id),
        "name": f"{rtc.first_name} {rtc.last_name}".strip(),
        "daily": daily,
        "results": results,
        "effectiveness_pct": effectiveness,
    }


def product_detail(viewer, product_id: str) -> dict:
    """Potencial/venta por zona y top RTC para un producto (VisitProduct)."""
    from apps.catalog.models import Product
    from apps.visits.models import PotentialStatus, ProductKind, VisitProduct

    product = Product.objects.filter(id=product_id, is_deleted=False).first()
    if product is None:
        from apps.core.exceptions import NcError

        raise NcError("resource.not_found", "No encontramos ese producto.", status=404)

    rtc_ids = list(scoped_rtcs(viewer).values_list("id", flat=True))
    lines = VisitProduct.objects.filter(
        is_deleted=False,
        product=product,
        visit__is_deleted=False,
        visit__rtc_id__in=rtc_ids,
    ).select_related("visit__rtc__zone", "visit__rtc")

    by_zone: dict[str, dict] = {}
    by_rtc: dict[str, dict] = {}
    for line in lines:
        zone = line.visit.rtc.zone
        zname = zone.name if zone else "Sin zona"
        z = by_zone.setdefault(zname, {"zone": zname, "potential": 0.0, "concretado": 0.0})
        rkey = str(line.visit.rtc_id)
        r = by_rtc.setdefault(
            rkey,
            {
                "rtc_id": rkey,
                "name": f"{line.visit.rtc.first_name} {line.visit.rtc.last_name}".strip(),
                "concretado": 0.0,
            },
        )
        val = float(line.total_value or 0)
        if line.kind == ProductKind.POTENCIAL and line.status == PotentialStatus.ABIERTO:
            z["potential"] += val
        if line.kind == ProductKind.CONCRETADO or (
            line.kind == ProductKind.POTENCIAL and line.status != PotentialStatus.ABIERTO
        ):
            # concretado lines
            if line.kind == ProductKind.CONCRETADO:
                z["concretado"] += val
                r["concretado"] += val

    zones = sorted(by_zone.values(), key=lambda x: -x["potential"])
    sellers = sorted(by_rtc.values(), key=lambda x: -x["concretado"])[:5]
    return {
        "product_id": str(product.id),
        "name": product.name,
        "zones": zones,
        "top_sellers": sellers,
    }
