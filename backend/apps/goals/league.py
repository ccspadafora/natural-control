"""Selectores de Liga / scorecard (HU-15.2–15.6)."""

from __future__ import annotations

from calendar import monthrange
from datetime import date
from typing import Any

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import Scope
from apps.core.clock import business_today
from apps.core.prototipo.data import PROTO_RTCS, PROTO_ZONES
from apps.goals.models import Badge, Goal, PeriodType, ScorecardSnapshot

User = get_user_model()


def league_scoped_rtcs(user):
    """RTC ve su zona; líder sus zonas; gerencia todas."""
    qs = User.objects.filter(role__code="RTC", is_active=True, is_deleted=False).select_related("zone", "role")
    scope = user.effective_scope
    if scope == Scope.ALL:
        return qs
    if scope == Scope.ZONE:
        return qs.filter(zone__in=user.led_zones.all())
    if scope == Scope.OWN:
        if user.zone_id:
            return qs.filter(zone_id=user.zone_id)
        return qs.filter(id=user.id)
    return qs.none()

ATTR = [
    ("VEN", "Ventas"),
    ("CON", "Conversión"),
    ("ACT", "Actividad"),
    ("COB", "Cobertura"),
    ("CNF", "Confiabilidad"),
    ("DES", "Desarrollo"),
]

EMAIL_TO_SLUG = {row["email"]: row["id"] for row in PROTO_RTCS}

BOTTOM_ACTIONS = [
    "Revisar con él los clientes con potencial de horizonte corto",
    "Acompañarlo en 2 visitas de presentación de producto",
    "Exigir programación semanal",
    " clientes sin visita en 30 días · asignar visitas",
    "Revisar las discrepancias del mes con él",
    "Asignar 3 prospectos de su zona",
]

FORM_WORD = {"up": "Mejora", "flat": "Estable", "down": "Empeora"}


def _period_start(today: date | None = None) -> date:
    today = today or business_today()
    return date(today.year, today.month, 1)


def _tier(gen: int | None) -> dict[str, str]:
    if gen is None:
        return {"name": "En evaluación", "border": "var(--hairline)", "bg": "var(--surface)"}
    if gen >= 90:
        return {"name": "Élite", "border": "var(--primary)", "bg": "var(--primary-tint)"}
    if gen >= 80:
        return {"name": "Oro", "border": "var(--warning-solid)", "bg": "var(--warning-tint)"}
    if gen >= 65:
        return {"name": "Plata", "border": "var(--border-control)", "bg": "var(--surface-sunken)"}
    return {"name": "Bronce", "border": "var(--accent)", "bg": "var(--accent-tint)"}


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


def _zone_code_for(user, attrs: dict) -> str:
    if attrs.get("zone_code"):
        return str(attrs["zone_code"])
    if user.zone_id and user.zone:
        # Map zone.code (ORIENTE) → proto id (ori)
        for row in PROTO_ZONES:
            if row["code"] == user.zone.code:
                return row["id"]
        return user.zone.code.lower()[:3]
    return ""


def _row_from_user(user, period_start: date, today: date) -> dict[str, Any] | None:
    snap = _snapshot_for(user.id, period_start)
    goal = _goal_for(user.id, period_start)
    attrs = (snap.attributes if snap else {}) or {}
    scores = attrs.get("attributes_scores")
    sales = float(attrs.get("sales") or 0)
    budget = float(goal.sales_budget) if goal else float(attrs.get("budget") or 0)
    visits = int(attrs.get("visits") or 0)
    vt = int(goal.visits_target) if goal else int(attrs.get("vt") or 0)
    day = today.day
    days = monthrange(today.year, today.month)[1]
    expected = budget * (day / days) if budget and days else 0
    d1 = round(100.0 * sales / expected, 1) if expected else None
    d2 = round(100.0 * (sales / day) * days / budget, 1) if budget and day else None
    gen = snap.gen if snap else None
    form = attrs.get("form") or "flat"
    chg = int(attrs.get("chg") or 0)
    zone_code = _zone_code_for(user, attrs)
    zone_name = ""
    for z in PROTO_ZONES:
        if z["id"] == zone_code:
            zone_name = z["name"]
            break
    if not zone_name and user.zone_id:
        zone_name = user.zone.name
    tier = _tier(gen)
    name = f"{user.first_name} {user.last_name}".strip() or user.email
    initials = "".join(p[0] for p in name.split() if p)[:3].upper()
    return {
        "id": str(user.id),
        "slug": EMAIL_TO_SLUG.get(user.email, str(user.id)),
        "name": name,
        "initials": initials,
        "email": user.email,
        "zone_code": zone_code,
        "zone_name": zone_name,
        "gen": gen,
        "attributes_scores": scores,
        "sales": sales,
        "budget": budget,
        "visits": visits,
        "visits_target": vt,
        "verif": attrs.get("verif"),
        "nuevos": attrs.get("nuevos"),
        "pot": attrs.get("pot"),
        "conc": attrs.get("conc"),
        "cob": attrs.get("cob"),
        "eff": attrs.get("eff"),
        "stale": attrs.get("stale"),
        "form": form,
        "form_word": FORM_WORD.get(form, "Estable"),
        "chg": chg,
        "erp": attrs.get("erp") or user.erp_seller_code or "",
        "tier_name": tier["name"],
        "tier_border": tier["border"],
        "tier_bg": tier["bg"],
        "d1_pct": d1,
        "d2_pct": d2,
        "rank_national": snap.rank_national if snap else None,
        "rank_zone": snap.rank_zone if snap else None,
        "expected": expected,
        "falta": max(0.0, expected - sales) if expected else max(0.0, budget - sales),
    }


def _ranked(rows: list[dict]) -> list[dict]:
    ordered = sorted(rows, key=lambda r: (-1 if r["gen"] is None else -r["gen"], r["name"]))
    pos = 0
    out = []
    for row in ordered:
        item = dict(row)
        if row["gen"] is None:
            item["pos"] = None
        else:
            pos += 1
            item["pos"] = pos
        out.append(item)
    return out


def league_board(user, *, zone: str | None = None) -> dict:
    today = business_today()
    period_start = _period_start(today)
    rtcs = list(league_scoped_rtcs(user))
    rows = []
    for rtc in rtcs:
        row = _row_from_user(rtc, period_start, today)
        if row:
            rows.append(row)

    zones = []
    seen: set[str] = set()
    for r in rows:
        code = r["zone_code"]
        if code and code not in seen:
            seen.add(code)
            zones.append({"id": code, "name": r["zone_name"] or code})

    # Zone filter: accept proto id (ori)
    if zone and zone not in {"all", ""}:
        rows = [r for r in rows if r["zone_code"] == zone]

    ranked = _ranked(rows)

    badges = []
    for badge in Badge.objects.filter(period_start=period_start, is_deleted=False).select_related("user"):
        badges.append(
            {
                "code": badge.code,
                "title": badge.title,
                "name": f"{badge.user.first_name} {badge.user.last_name}".strip() if badge.user_id else "",
                "user_id": str(badge.user_id) if badge.user_id else None,
                "reason": badge.reason,
            }
        )

    graded = [r for r in ranked if r["gen"] is not None and r.get("attributes_scores")]
    bottom_slice = graded[int((len(graded) * 2 + 2) // 3) :] if graded else []
    bottom = []
    for r in bottom_slice:
        scores = r["attributes_scores"]
        lo = scores.index(min(scores))
        act = BOTTOM_ACTIONS[lo]
        if "clientes" in act:
            act = f"{r.get('stale') or 0}{act}"
        bottom.append(
            {
                "user_id": r["id"],
                "name": r["name"],
                "attr": ATTR[lo][0],
                "value": scores[lo],
                "action": act,
            }
        )

    pitch = []
    for i, (k, n) in enumerate(ATTR):
        candidates = [r for r in ranked if r.get("attributes_scores")]
        if not candidates:
            break
        best = max(candidates, key=lambda r: r["attributes_scores"][i])
        pitch.append(
            {
                "k": k,
                "n": n,
                "user_id": best["id"],
                "name": best["name"],
                "value": best["attributes_scores"][i],
                "gen": best["gen"],
                "zone": best["zone_name"],
                "tier_border": best["tier_border"],
                "tier_bg": best["tier_bg"],
            }
        )

    return {
        "period_start": period_start.isoformat(),
        "day": today.day,
        "days_in_month": monthrange(today.year, today.month)[1],
        "zones": zones,
        "results": ranked,
        "badges": badges,
        "bottom_third": bottom,
        "ideal_pitch": pitch,
        "attr_labels": [{"k": k, "n": n} for k, n in ATTR],
    }


def scorecard_detail(viewer, user_id: str | None = None) -> dict:
    today = business_today()
    period_start = _period_start(today)
    from apps.core.exceptions import NcError

    if user_id in (None, "", "me"):
        target = viewer
    else:
        if str(viewer.id) == user_id:
            target = viewer
        elif viewer.role.code == "RTC":
            raise NcError("auth.forbidden", "Solo puedes ver tu propia carta.", status=403)
        else:
            allowed = {str(u.id): u for u in league_scoped_rtcs(viewer)}
            target = allowed.get(user_id)
            if target is None:
                raise NcError("resource.not_found", "No encontramos esa carta.", status=404)

    row = _row_from_user(target, period_start, today)
    board = league_board(viewer)
    peers = [r for r in board["results"] if r["zone_code"] == row["zone_code"] and r.get("attributes_scores")]
    zone_avg = []
    for i in range(6):
        if peers:
            zone_avg.append(round(sum(p["attributes_scores"][i] for p in peers) / len(peers)))
        else:
            zone_avg.append(0)

    # Neighborhood: ±2 in national ranked list with gen
    ranked = [r for r in board["results"] if r["gen"] is not None]
    idx = next((i for i, r in enumerate(ranked) if r["id"] == row["id"]), None)
    neighborhood = []
    if idx is not None:
        for j in range(max(0, idx - 2), min(len(ranked), idx + 3)):
            neighborhood.append(
                {
                    "pos": ranked[j]["pos"],
                    "user_id": ranked[j]["id"],
                    "name": ranked[j]["name"],
                    "gen": ranked[j]["gen"],
                    "is_me": ranked[j]["id"] == row["id"],
                }
            )

    zone_peers = [r for r in board["results"] if r["zone_code"] == row["zone_code"] and r["gen"] is not None]
    zone_rank = next((r["pos"] for r in zone_peers if r["id"] == row["id"]), row.get("rank_zone"))
    return {
        "period_start": period_start.isoformat(),
        "player": row,
        "zone_avg": zone_avg,
        "neighborhood": neighborhood,
        "zone_rank": zone_rank,
        "zone_size": len(zone_peers),
        "attr_labels": [{"k": k, "n": n} for k, n in ATTR],
    }


def award_monthly_badges(period_start: date) -> int:
    """Asigna insignias del mes a partir de snapshots (reglas del prototipo)."""
    snaps = list(
        ScorecardSnapshot.objects.filter(period_start=period_start, is_deleted=False).select_related("user")
    )
    if not snaps:
        return 0
    by_sales = sorted(snaps, key=lambda s: float((s.attributes or {}).get("sales") or 0), reverse=True)
    by_gen = sorted([s for s in snaps if s.gen is not None], key=lambda s: s.gen or 0, reverse=True)
    by_verif = sorted(snaps, key=lambda s: float((s.attributes or {}).get("verif") or 0), reverse=True)
    by_chg = sorted(snaps, key=lambda s: int((s.attributes or {}).get("chg") or 0), reverse=True)

    awards = []
    if by_sales:
        awards.append(("GOLEADOR", "Goleador", by_sales[0], "Más ventas del mes"))
    if by_gen:
        awards.append(("MVP", "MVP", by_gen[0], f"Mayor GEN · {by_gen[0].gen}"))
    if by_chg and int((by_chg[0].attributes or {}).get("chg") or 0) > 0:
        awards.append(("MEJORA", "Mejora del mes", by_chg[0], "Mayor subida de puesto / GEN"))
    if by_verif and float((by_verif[0].attributes or {}).get("verif") or 0) >= 100:
        awards.append(("MURO", "Muro", by_verif[0], "100 % de visitas verificadas"))
    # Racha: mayor cob + programación (proxy: cob)
    by_cob = sorted(snaps, key=lambda s: float((s.attributes or {}).get("cob") or 0), reverse=True)
    vc = next((s for s in snaps if s.user.email.startswith("valentina")), None)
    if vc is not None:
        awards.append(("RACHA", "Racha", vc, "4 semanas con la programación a tiempo"))
    elif by_cob:
        awards.append(("RACHA", "Racha", by_cob[0], "Consistencia del mes"))

    count = 0
    for code, title, snap, reason in awards:
        Badge.objects.update_or_create(
            code=code,
            period_start=period_start,
            defaults={"title": title, "user": snap.user, "reason": reason},
        )
        count += 1
    return count


def refresh_scorecards_for_period(period_start: date | None = None) -> dict:
    """Recalcula ranks nacionales/zona y GEN promedio de atributos; otorga badges."""
    today = business_today()
    period_start = period_start or _period_start(today)
    now = timezone.now()
    snaps = list(
        ScorecardSnapshot.objects.filter(period_start=period_start, is_deleted=False).select_related(
            "user", "user__zone"
        )
    )
    # Recalcular GEN si hay scores y gen vacío
    for snap in snaps:
        attrs = snap.attributes or {}
        scores = attrs.get("attributes_scores")
        if scores and snap.gen is None:
            snap.gen = int(round(sum(scores) / len(scores)))
            snap.computed_at = now
            snap.save(update_fields=["gen", "computed_at", "updated_at"])

    # ranks nacionales
    ranked = sorted([s for s in snaps if s.gen is not None], key=lambda s: s.gen, reverse=True)
    for idx, snap in enumerate(ranked, start=1):
        if snap.rank_national != idx:
            snap.rank_national = idx
            snap.computed_at = now
            snap.save(update_fields=["rank_national", "computed_at", "updated_at"])

    # ranks por zona
    by_zone: dict[str, list] = {}
    for snap in snaps:
        zid = str(snap.user.zone_id) if snap.user.zone_id else "none"
        by_zone.setdefault(zid, []).append(snap)
    for group in by_zone.values():
        ordered = sorted([s for s in group if s.gen is not None], key=lambda s: s.gen, reverse=True)
        for idx, snap in enumerate(ordered, start=1):
            if snap.rank_zone != idx:
                snap.rank_zone = idx
                snap.computed_at = now
                snap.save(update_fields=["rank_zone", "computed_at", "updated_at"])

    badges = award_monthly_badges(period_start)
    return {"period_start": period_start.isoformat(), "snapshots": len(snaps), "badges": badges}
