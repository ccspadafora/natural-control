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
    ).select_related("product", "visit", "visit__rtc", "visit__rtc__zone")
    return scope_queryset(qs, user, owner_field="visit__rtc")


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

    gap = None
    if user.effective_scope == Scope.OWN or user.role.code == "RTC":
        period_start = date(today.year, today.month, 1)
        goal = (
            Goal.objects.filter(
                user=user, period_type=PeriodType.MES, period_start=period_start, is_deleted=False
            ).first()
            or Goal.objects.filter(user=user, period_type=PeriodType.MES, is_deleted=False)
            .order_by("-period_start")
            .first()
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
        gap = {
            "budget": budget,
            "sales": sales,
            "falta": falta,
            "ticket_avg": ticket_avg,
            "close_rate": close_rate,
            "visits_needed": visits_needed,
            "days_left": monthrange(today.year, today.month)[1] - today.day,
        }

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
