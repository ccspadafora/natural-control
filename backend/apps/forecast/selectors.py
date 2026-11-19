"""Forecast vivo a partir de VisitProduct (potencial abierto)."""

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date
from decimal import Decimal

from apps.accounts.models import Scope
from apps.core.clock import business_today
from apps.core.scoping import scope_queryset
from apps.goals.models import Goal, PeriodType, ScorecardSnapshot
from apps.parameters.services import get_setting
from apps.visits.models import Horizon, PotentialStatus, ProductKind, VisitProduct, VisitResult


def _default_probs() -> dict:
    try:
        return get_setting("forecast.default_probability") or {"CORTO": 70, "MEDIANO": 40, "LARGO": 20}
    except Exception:
        return {"CORTO": 70, "MEDIANO": 40, "LARGO": 20}


def _open_potential(user):
    qs = VisitProduct.objects.filter(
        is_deleted=False,
        kind=ProductKind.POTENCIAL,
        status=PotentialStatus.ABIERTO,
        visit__is_deleted=False,
    ).select_related(
        "product",
        "visit",
        "visit__rtc",
        "visit__rtc__zone",
        "visit__client",
        "visit__site",
        "visit__site__municipality",
    )
    return scope_queryset(qs, user, owner_field="visit__rtc")


_HORIZON_SORT = {"CORTO": 0, "MEDIANO": 1, "LARGO": 2, "": 3}


def _cop(amount: float) -> str:
    return f"${amount:,.0f}".replace(",", ".")


def _visit_iso_date(visit) -> str | None:
    when = visit.completed_at or visit.scheduled_start
    if not when:
        return None
    return when.date().isoformat()


def _forecast_gap(user) -> dict | None:
    if user.effective_scope != Scope.OWN and user.role.code != "RTC":
        return None
    today = business_today()
    period_start = date(today.year, today.month, 1)
    goal = (
        Goal.objects.filter(user=user, period_type=PeriodType.MES, period_start=period_start, is_deleted=False).first()
        or Goal.objects.filter(user=user, period_type=PeriodType.MES, is_deleted=False).order_by("-period_start").first()
    )
    snap = (
        ScorecardSnapshot.objects.filter(user=user, period_start=period_start, is_deleted=False).first()
        or ScorecardSnapshot.objects.filter(user=user, is_deleted=False).order_by("-period_start").first()
    )
    budget = float(goal.sales_budget) if goal else 0.0
    sales = float(((snap.attributes if snap else {}) or {}).get("sales") or 0)
    falta = max(0.0, budget - sales)
    ticket_avg = 2_800_000.0
    close_rate = 0.38
    visits_needed = int((falta / ticket_avg / close_rate) + 0.999) if falta and ticket_avg and close_rate else 0
    return {
        "budget": budget,
        "sales": sales,
        "falta": falta,
        "ticket_avg": ticket_avg,
        "close_rate": close_rate,
        "visits_needed": visits_needed,
        "days_left": monthrange(today.year, today.month)[1] - today.day,
    }


def _deal_tips(deals: list[dict], gap: dict | None, totals: dict) -> list[str]:
    tips: list[str] = []
    corto = [d for d in deals if d.get("horizon") == "CORTO"]
    if corto:
        val = sum(d["total_value"] for d in corto)
        tips.append(f"Tienes {len(corto)} en horizonte corto por {_cop(val)} — agenda seguimiento esta semana.")
    committed = totals.get("committed", 0.0)
    probable = totals.get("probable", 0.0)
    if gap:
        falta = gap.get("falta") or 0.0
        if falta > 0 and committed >= falta:
            tips.append(f"Lo comprometido ({_cop(committed)}) cubre lo que te falta — confirma fechas de cierre.")
        elif falta > 0 and probable >= falta:
            tips.append(
                f"El probable ({_cop(probable)}) alcanza la brecha si conviertes los negocios en curso."
            )
        elif gap.get("visits_needed"):
            tips.append(
                f"Agenda al menos {gap['visits_needed']} citas nuevas (ticket ~{_cop(gap['ticket_avg'])})."
            )
    mediano = [d for d in deals if d.get("horizon") == "MEDIANO"]
    if len(tips) < 3 and mediano:
        val = sum(d["probable_value"] for d in mediano)
        tips.append(f"Refuerza {len(mediano)} oportunidades mediano plazo ({_cop(val)} probable).")
    return tips[:3]


def forecast_deals_payload(
    user, *, horizon: str | None = None, product_id: str | None = None
) -> dict:
    probs = _default_probs()
    qs = _open_potential(user)
    if horizon in {Horizon.CORTO, Horizon.MEDIANO, Horizon.LARGO}:
        qs = qs.filter(horizon=horizon)
    if product_id:
        qs = qs.filter(product_id=product_id)
    lines = list(qs)

    committed_results = {VisitResult.PEDIDO_CONFIRMADO, VisitResult.COTIZACION_SOLICITADA}
    optimistic = Decimal("0")
    probable = Decimal("0")
    committed = Decimal("0")
    by_horizon = {"corto": 0, "mediano": 0, "largo": 0, "sin_horizonte": 0}

    deals: list[dict] = []
    for line in lines:
        total = float(line.total_value or 0)
        optimistic += Decimal(str(total))
        prob_val = float(_line_probable(Decimal(str(total)), line.probability, line.horizon, probs))
        probable += Decimal(str(prob_val))
        if line.visit.result in committed_results:
            committed += Decimal(str(total))

        h = line.horizon
        if h == Horizon.CORTO:
            by_horizon["corto"] += 1
        elif h == Horizon.MEDIANO:
            by_horizon["mediano"] += 1
        elif h == Horizon.LARGO:
            by_horizon["largo"] += 1
        else:
            by_horizon["sin_horizonte"] += 1

        visit = line.visit
        client = visit.client
        rtc = visit.rtc
        municipality = ""
        if visit.site_id and visit.site.municipality_id:
            municipality = visit.site.municipality.name

        deals.append(
            {
                "id": str(line.id),
                "product_name": line.product.name,
                "client_id": str(client.id),
                "client_name": client.trade_name or client.legal_name,
                "municipality": municipality,
                "total_value": total,
                "probable_value": prob_val,
                "horizon": h or "",
                "probability": line.probability,
                "expected_date": line.expected_date.isoformat() if line.expected_date else None,
                "visit_id": str(visit.id),
                "visit_result": visit.result or "",
                "visit_date": _visit_iso_date(visit),
                "rtc_name": f"{rtc.first_name} {rtc.last_name}".strip() or rtc.email,
                "status": line.status,
            }
        )

    deals.sort(
        key=lambda d: (
            _HORIZON_SORT.get(d["horizon"] or "", 3),
            d["expected_date"] or "9999-12-31",
            -d["total_value"],
        )
    )

    totals = {
        "optimistic": float(optimistic),
        "probable": float(probable),
        "committed": float(committed),
    }
    gap = _forecast_gap(user)
    tips = _deal_tips(deals, gap, totals)

    return {
        "deals": deals,
        "summary": {
            "count": len(deals),
            "by_horizon": by_horizon,
            "totals": totals,
            "gap": gap,
            "tips": tips,
        },
    }


def _line_probable(total: Decimal, probability: int | None, horizon: str | None, probs: dict) -> Decimal:
    if probability is not None:
        pct = probability
    elif horizon:
        pct = int(probs.get(horizon, 20))
    else:
        pct = 20
    return (total * Decimal(pct) / Decimal(100)).quantize(Decimal("0.01"))


def forecast_payload(user, months: int = 4) -> dict:
    today = business_today()
    probs = _default_probs()
    lines = list(_open_potential(user))
    optimistic = Decimal("0")
    probable = Decimal("0")
    committed = Decimal("0")
    by_month: dict[str, dict] = defaultdict(lambda: {"corto": Decimal("0"), "mediano": Decimal("0"), "largo": Decimal("0")})
    by_rtc: dict[str, dict] = {}
    by_product: dict[str, dict] = {}

    committed_results = {VisitResult.PEDIDO_CONFIRMADO, VisitResult.COTIZACION_SOLICITADA}

    for line in lines:
        total = Decimal(str(line.total_value or 0))
        optimistic += total
        probable += _line_probable(total, line.probability, line.horizon, probs)
        if line.visit.result in committed_results:
            committed += total

        month_key = (line.expected_date or today).replace(day=1).isoformat()
        horizon_key = {
            Horizon.CORTO: "corto",
            Horizon.MEDIANO: "mediano",
            Horizon.LARGO: "largo",
        }.get(line.horizon or Horizon.LARGO, "largo")
        by_month[month_key][horizon_key] += total

        rtc = line.visit.rtc
        rtc_key = str(rtc.id)
        bucket = by_rtc.setdefault(
            rtc_key,
            {
                "id": rtc_key,
                "name": f"{rtc.first_name} {rtc.last_name}".strip() or rtc.email,
                "zone": rtc.zone.name if rtc.zone_id else "",
                "optimistic": Decimal("0"),
                "probable": Decimal("0"),
                "committed": Decimal("0"),
                "hit_rate": None,
            },
        )
        bucket["optimistic"] += total
        bucket["probable"] += _line_probable(total, line.probability, line.horizon, probs)
        if line.visit.result in committed_results:
            bucket["committed"] += total

        prod_key = str(line.product_id)
        pb = by_product.setdefault(
            prod_key,
            {
                "id": prod_key,
                "name": line.product.name,
                "optimistic": Decimal("0"),
                "probable": Decimal("0"),
                "committed": Decimal("0"),
            },
        )
        pb["optimistic"] += total
        pb["probable"] += _line_probable(total, line.probability, line.horizon, probs)
        if line.visit.result in committed_results:
            pb["committed"] += total

    # Acierto histórico por RTC
    for rtc_key, bucket in by_rtc.items():
        closed = VisitProduct.objects.filter(
            visit__rtc_id=rtc_key,
            kind=ProductKind.POTENCIAL,
            status__in=[PotentialStatus.GANADO, PotentialStatus.PERDIDO, PotentialStatus.VENCIDO],
            is_deleted=False,
        )
        won = closed.filter(status=PotentialStatus.GANADO).count()
        total_closed = closed.count()
        bucket["hit_rate"] = round(100.0 * won / total_closed, 1) if total_closed else None
        bucket["optimistic"] = float(bucket["optimistic"])
        bucket["probable"] = float(bucket["probable"])
        bucket["committed"] = float(bucket["committed"])

    # Meses ordenados a partir de hoy
    month_rows = []
    cursor = date(today.year, today.month, 1)
    for _ in range(max(1, months)):
        key = cursor.isoformat()
        data = by_month.get(key, {"corto": Decimal("0"), "mediano": Decimal("0"), "largo": Decimal("0")})
        month_rows.append(
            {
                "month": key,
                "label": cursor.strftime("%b.").replace(".", "."),
                "corto": float(data["corto"]),
                "mediano": float(data["mediano"]),
                "largo": float(data["largo"]),
            }
        )
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)

    # Si el mes actual está vacío pero hay líneas en meses futuros del seed (nov–feb),
    # alinear al primer mes con datos cuando estamos en demo congelada en octubre.
    if all(r["corto"] == 0 and r["mediano"] == 0 and r["largo"] == 0 for r in month_rows) and by_month:
        month_rows = []
        for key in sorted(by_month.keys())[:months]:
            data = by_month[key]
            d = date.fromisoformat(key)
            month_rows.append(
                {
                    "month": key,
                    "label": d.strftime("%b."),
                    "corto": float(data["corto"]),
                    "mediano": float(data["mediano"]),
                    "largo": float(data["largo"]),
                }
            )

    products = sorted(
        [
            {
                "id": p["id"],
                "name": p["name"],
                "optimistic": float(p["optimistic"]),
                "probable": float(p["probable"]),
                "committed": float(p["committed"]),
            }
            for p in by_product.values()
        ],
        key=lambda x: -x["optimistic"],
    )

    rtc_rows = sorted(by_rtc.values(), key=lambda x: -x["optimistic"])
    if user.effective_scope == Scope.OWN:
        rtc_rows = []

    gap = _forecast_gap(user)

    return {
        "totals": {
            "optimistic": float(optimistic),
            "probable": float(probable),
            "committed": float(committed),
        },
        "by_month": month_rows,
        "by_rtc": rtc_rows,
        "by_product": products,
        "gap": gap,
    }
