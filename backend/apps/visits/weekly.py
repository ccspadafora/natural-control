from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Scope, User
from apps.audit.services import record
from apps.core.exceptions import NcError
from apps.core.scoping import scope_queryset
from apps.crm.selectors import client_for
from apps.notifications.models import Notification
from apps.parameters.services import get_setting
from apps.visits.models import (
    Slot,
    Visit,
    VisitOrigin,
    VisitPriority,
    VisitReason,
    VisitStatus,
    WeeklyPlan,
    WeeklyPlanItem,
    WeeklyPlanStatus,
)
from apps.visits.realtime import publish_plan

SLOT_HOUR = {Slot.MANANA: 8, Slot.TARDE: 14, Slot.DIA: 9}
OPEN = (WeeklyPlanStatus.BORRADOR, WeeklyPlanStatus.DEVUELTA)
SENT = (WeeklyPlanStatus.ENVIADA, WeeklyPlanStatus.APROBADA)


def target_period(now=None) -> tuple[int, int]:
    moment = timezone.localtime(now or timezone.now())
    day = moment.date() + timedelta(weeks=int(get_setting("weekly_plan.target_week_offset")))
    iso = day.isocalendar()
    return iso.year, iso.week


def week_bounds(iso_year: int, iso_week: int):
    try:
        start = datetime.fromisocalendar(iso_year, iso_week, 1).date()
        end = datetime.fromisocalendar(iso_year, iso_week, 7).date()
    except ValueError as exc:
        raise NcError("plan.invalid", "Esa semana no existe.", status=400) from exc
    return start, end


def deadline_for(iso_year: int, iso_week: int):
    weekday = int(get_setting("weekly_plan.deadline_weekday"))
    if weekday < 1 or weekday > 7:
        weekday = 1
    raw = str(get_setting("weekly_plan.deadline_time") or "12:00")
    hour, minute = (int(part) for part in raw.split(":")[:2])
    offset = int(get_setting("weekly_plan.target_week_offset"))
    start, _end = week_bounds(iso_year, iso_week)
    day = start - timedelta(weeks=offset) + timedelta(days=weekday - 1)
    moment = datetime.combine(day, time(hour, minute))
    return timezone.make_aware(moment, timezone.get_current_timezone())


def _name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


def _rtc_in_scope(actor: User, rtc: User) -> bool:
    if actor.effective_scope == Scope.ALL:
        return True
    if actor.effective_scope == Scope.ZONE:
        zones = set(actor.led_zones.values_list("id", flat=True))
        if actor.zone_id:
            zones.add(actor.zone_id)
        return rtc.zone_id in zones
    return rtc.id == actor.id


def set_requirement(actor: User, user_id, required: bool, reason: str) -> User:
    if not actor.has_perm_code("weekly_plan.require"):
        raise NcError("auth.forbidden", "No tienes permiso para exigir la programación.", status=403)
    rtc = User.objects.filter(id=user_id, is_deleted=False, role__code="RTC").select_related("role", "zone").first()
    if rtc is None or not _rtc_in_scope(actor, rtc):
        raise NcError("resource.not_found", "No encontramos ese comercial.", status=404)
    note = (reason or "").strip()
    if required and len(note) < 3:
        raise NcError("plan.reason", "Escribe el motivo.", status=400)
    rtc.requires_weekly_plan = bool(required)
    rtc.requires_weekly_plan_reason = note if required else ""
    rtc.requires_weekly_plan_since = timezone.now() if required else None
    rtc.save(
        update_fields=[
            "requires_weekly_plan",
            "requires_weekly_plan_reason",
            "requires_weekly_plan_since",
            "updated_at",
        ]
    )
    record(actor, "weekly_plan.require", rtc, after={"required": rtc.requires_weekly_plan, "reason": rtc.requires_weekly_plan_reason})
    return rtc


def reminder_for(rtc: User, plan: WeeklyPlan | None, now=None) -> str | None:
    if not rtc.requires_weekly_plan:
        return None
    if plan is not None and plan.status in SENT:
        return None
    now = now or timezone.now()
    year, week = (plan.iso_year, plan.iso_week) if plan is not None else target_period(now)
    deadline = plan.deadline_at if plan is not None else deadline_for(year, week)
    remaining = deadline - now
    if remaining.total_seconds() <= 0:
        return "vencido"
    if remaining <= timedelta(hours=2):
        return "2h"
    if remaining <= timedelta(hours=24):
        return "24h"
    return None


def current_plan(user: User) -> tuple[WeeklyPlan | None, int, int]:
    if not user.has_perm_code("weekly_plan.view"):
        raise NcError("auth.forbidden", "No tienes permiso para ver la programación.", status=403)
    year, week = target_period()
    plan = (
        WeeklyPlan.objects.filter(rtc=user, iso_year=year, iso_week=week)
        .prefetch_related("items__client", "items__reason")
        .first()
    )
    return plan, year, week


@transaction.atomic
def open_plan(user: User) -> WeeklyPlan:
    if not user.has_perm_code("weekly_plan.submit"):
        raise NcError("auth.forbidden", "No tienes permiso para armar la programación.", status=403)
    if not user.requires_weekly_plan:
        raise NcError("plan.not_required", "Gerencia no te está pidiendo la programación.", status=403)
    year, week = target_period()
    plan = WeeklyPlan.objects.filter(rtc=user, iso_year=year, iso_week=week).first()
    if plan is not None:
        return plan
    plan = WeeklyPlan.objects.create(
        rtc=user,
        iso_year=year,
        iso_week=week,
        deadline_at=deadline_for(year, week),
        created_by=user,
        updated_by=user,
    )
    record(user, "weekly_plan.create", plan, after={"iso_year": year, "iso_week": week})
    return plan


def _owned(user: User, plan_id, *, write: bool) -> WeeklyPlan:
    plan = WeeklyPlan.objects.select_related("rtc").filter(id=plan_id).first()
    if plan is None or not _rtc_in_scope(user, plan.rtc):
        raise NcError("resource.not_found", "No encontramos esa programación.", status=404)
    if write:
        if plan.rtc_id != user.id:
            raise NcError("auth.forbidden", "Solo el comercial puede editar su programación.", status=403)
        if plan.status not in OPEN:
            raise NcError("plan.locked", "Esta programación ya se envió.", status=409)
    return plan


def _item_fields(user: User, plan: WeeklyPlan, data: dict):
    client = client_for(plan.rtc, data.get("client_id"))
    site = client.sites.filter(id=data.get("site_id"), is_deleted=False).first()
    if site is None:
        site = client.sites.filter(is_deleted=False, is_primary=True).first()
    if site is None:
        raise NcError("plan.site", "El cliente no tiene sede.", status=400)
    planned = data.get("planned_date")
    from django.utils.dateparse import parse_date

    day = planned if hasattr(planned, "year") else parse_date(str(planned or ""))
    start, end = week_bounds(plan.iso_year, plan.iso_week)
    if day is None or day < start or day > end:
        raise NcError("plan.date", "La fecha tiene que caer en esa semana.", status=400)
    slot = data.get("slot") or Slot.DIA
    if slot not in Slot.values:
        raise NcError("plan.invalid", "Elige la franja.", status=400)
    reason = None
    if data.get("reason_id"):
        reason = VisitReason.objects.filter(id=data["reason_id"], is_deleted=False, is_active=True).first()
        if reason is None:
            raise NcError("plan.invalid", "Elige un motivo.", status=400)
    objective = (data.get("objective") or "").strip()
    if len(objective) > 250:
        raise NcError("plan.invalid", "El objetivo es demasiado largo.", status=400)
    return client, site, day, slot, reason, objective


def _overlap(rtc, start, end, ignore_id=None) -> bool:
    qs = Visit.objects.filter(
        rtc=rtc,
        is_deleted=False,
        status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO],
        scheduled_start__lt=end,
        scheduled_end__gt=start,
    )
    if ignore_id:
        qs = qs.exclude(id=ignore_id)
    return qs.exists()


def _slot_window(day, slot):
    start = timezone.make_aware(datetime.combine(day, time(SLOT_HOUR[slot], 0)), timezone.get_current_timezone())
    return start, start + timedelta(minutes=60)


@transaction.atomic
def add_item(user: User, plan_id, data: dict) -> tuple[WeeklyPlanItem, str | None]:
    plan = _owned(user, plan_id, write=True)
    client, site, day, slot, reason, objective = _item_fields(user, plan, data)
    start, end = _slot_window(day, slot)
    warning = "Se cruza con otra visita tuya. Puedes dejarla así." if _overlap(plan.rtc, start, end) else None
    item = WeeklyPlanItem.objects.create(
        plan=plan,
        client=client,
        site=site,
        planned_date=day,
        slot=slot,
        reason=reason,
        objective=objective,
        created_by=user,
        updated_by=user,
    )
    item._warning = warning
    return item, warning


@transaction.atomic
def update_item(user: User, item_id, data: dict) -> tuple[WeeklyPlanItem, str | None]:
    item = WeeklyPlanItem.objects.select_related("plan", "visit").filter(id=item_id).first()
    if item is None:
        raise NcError("resource.not_found", "No encontramos esa visita de la programación.", status=404)
    _owned(user, item.plan_id, write=True)
    if item.visit_id:
        raise NcError("plan.locked", "Esa visita ya quedó en la agenda.", status=409)
    client, site, day, slot, reason, objective = _item_fields(user, item.plan, data)
    start, end = _slot_window(day, slot)
    warning = "Se cruza con otra visita tuya. Puedes dejarla así." if _overlap(item.plan.rtc, start, end) else None
    item.client = client
    item.site = site
    item.planned_date = day
    item.slot = slot
    item.reason = reason
    item.objective = objective
    item.updated_by = user
    item.save()
    item._warning = warning
    return item, warning


@transaction.atomic
def delete_item(user: User, item_id) -> None:
    item = WeeklyPlanItem.objects.select_related("plan").filter(id=item_id).first()
    if item is None:
        raise NcError("resource.not_found", "No encontramos esa visita de la programación.", status=404)
    _owned(user, item.plan_id, write=True)
    if item.visit_id:
        raise NcError("plan.locked", "Esa visita ya quedó en la agenda.", status=409)
    item.delete()


def _materialize(plan: WeeklyPlan, actor: User) -> list[str]:
    warnings = []
    for item in plan.items.select_related("client", "site", "reason"):
        if item.visit_id:
            continue
        start, end = _slot_window(item.planned_date, item.slot)
        if _overlap(plan.rtc, start, end):
            warnings.append(f"{item.client.trade_name or item.client.legal_name} se cruza con otra visita.")
        visit = Visit.objects.create(
            client=item.client,
            site=item.site,
            rtc=plan.rtc,
            assigned_by=actor,
            origin=VisitOrigin.PROGRAMACION,
            reason=item.reason,
            priority=VisitPriority.MEDIA,
            scheduled_start=start,
            scheduled_end=end,
            status=VisitStatus.PROGRAMADA,
            created_by=actor,
            updated_by=actor,
        )
        item.visit = visit
        item.save(update_fields=["visit", "updated_at"])
        visit.weekly_plan_item = item
        visit.save(update_fields=["weekly_plan_item", "updated_at"])
    return warnings


@transaction.atomic
def submit_plan(user: User, plan_id) -> tuple[WeeklyPlan, list[str]]:
    plan = WeeklyPlan.objects.select_for_update().select_related("rtc").get(id=_owned(user, plan_id, write=True).id)
    if not plan.items.exists():
        raise NcError("plan.empty", "Agrega al menos una visita.", status=400)
    plan.submitted_at = timezone.now()
    plan.is_late = plan.submitted_at > plan.deadline_at
    plan.updated_by = user
    warnings: list[str] = []
    if bool(get_setting("weekly_plan.auto_approve")):
        plan.status = WeeklyPlanStatus.APROBADA
        plan.reviewed_by = user
        warnings = _materialize(plan, user)
    else:
        plan.status = WeeklyPlanStatus.ENVIADA
    plan.save()
    record(user, "weekly_plan.submit", plan, after={"status": plan.status, "is_late": plan.is_late})
    _notify_reviewers(plan)
    transaction.on_commit(lambda: publish_plan(plan))
    return plan, warnings


@transaction.atomic
def approve_plan(actor: User, plan_id, note: str = "") -> tuple[WeeklyPlan, list[str]]:
    if not actor.has_perm_code("weekly_plan.review"):
        raise NcError("auth.forbidden", "No tienes permiso para aprobar la programación.", status=403)
    plan = WeeklyPlan.objects.select_for_update().select_related("rtc").filter(id=plan_id).first()
    if plan is None or not _rtc_in_scope(actor, plan.rtc):
        raise NcError("resource.not_found", "No encontramos esa programación.", status=404)
    if plan.status != WeeklyPlanStatus.ENVIADA:
        raise NcError("plan.locked", "Solo se aprueba una programación enviada.", status=409)
    plan.status = WeeklyPlanStatus.APROBADA
    plan.reviewed_by = actor
    plan.review_note = (note or "").strip()
    plan.updated_by = actor
    warnings = _materialize(plan, actor)
    plan.save()
    record(actor, "weekly_plan.approve", plan, after={"status": plan.status})
    return plan, warnings


@transaction.atomic
def return_plan(actor: User, plan_id, note: str) -> WeeklyPlan:
    if not actor.has_perm_code("weekly_plan.review"):
        raise NcError("auth.forbidden", "No tienes permiso para devolver la programación.", status=403)
    plan = WeeklyPlan.objects.select_for_update().select_related("rtc").filter(id=plan_id).first()
    if plan is None or not _rtc_in_scope(actor, plan.rtc):
        raise NcError("resource.not_found", "No encontramos esa programación.", status=404)
    if plan.status != WeeklyPlanStatus.ENVIADA:
        raise NcError("plan.locked", "Solo se devuelve una programación enviada.", status=409)
    text = (note or "").strip()
    if len(text) < 3:
        raise NcError("plan.note", "Escribe por qué la devuelves.", status=400)
    plan.status = WeeklyPlanStatus.DEVUELTA
    plan.reviewed_by = actor
    plan.review_note = text
    plan.updated_by = actor
    plan.save()
    record(actor, "weekly_plan.return", plan, after={"note": text})
    return plan


def _bucket(plan: WeeklyPlan | None, now, deadline) -> str:
    moment = plan.deadline_at if plan is not None else deadline
    if plan is None or plan.status in OPEN:
        return "faltante" if now > moment else "pendiente"
    if plan.is_late:
        return "tarde"
    return "a_tiempo"


def compliance(actor: User, iso_year: int | None = None, iso_week: int | None = None):
    if not actor.has_perm_code("weekly_plan.review"):
        raise NcError("auth.forbidden", "No tienes permiso para ver el cumplimiento.", status=403)
    if iso_year is None or iso_week is None:
        iso_year, iso_week = target_period()
    start, end = week_bounds(iso_year, iso_week)
    rtcs = User.objects.filter(is_deleted=False, is_active=True, role__code="RTC", requires_weekly_plan=True).select_related("zone")
    if actor.effective_scope == Scope.ZONE:
        zones = set(actor.led_zones.values_list("id", flat=True))
        if actor.zone_id:
            zones.add(actor.zone_id)
        rtcs = rtcs.filter(zone_id__in=zones)
    elif actor.effective_scope != Scope.ALL:
        rtcs = rtcs.none()
    plans = {
        plan.rtc_id: plan
        for plan in WeeklyPlan.objects.filter(iso_year=iso_year, iso_week=iso_week, rtc__in=rtcs).prefetch_related("items__visit")
    }
    now = timezone.now()
    deadline = deadline_for(iso_year, iso_week)
    rows = []
    for rtc in rtcs.order_by("first_name", "email"):
        plan = plans.get(rtc.id)
        planned = plan.items.count() if plan else 0
        done = plan.items.filter(visit__status=VisitStatus.REALIZADA, visit__is_deleted=False).count() if plan else 0
        rows.append(
            {
                "rtc_id": str(rtc.id),
                "rtc_name": _name(rtc),
                "zone_name": rtc.zone.name if rtc.zone_id else "",
                "reason": rtc.requires_weekly_plan_reason,
                "plan_id": str(plan.id) if plan else None,
                "status": plan.status if plan else "",
                "is_late": bool(plan and plan.is_late),
                "submitted_at": plan.submitted_at.isoformat() if plan and plan.submitted_at else None,
                "planned": planned,
                "done": done,
                "bucket": _bucket(plan, now, deadline),
            }
        )
    return {
        "iso_year": iso_year,
        "iso_week": iso_week,
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "deadline_at": deadline_for(iso_year, iso_week).isoformat(),
        "results": rows,
    }


def _notify(user: User, kind: str, title: str, body: str, link: str) -> None:
    if Notification.objects.filter(user=user, kind=kind, link=link, is_deleted=False).exists():
        return
    Notification.objects.create(user=user, kind=kind, title=title, body=body, link=link, channels_sent=["in_app"])


def _reviewers(rtc: User):
    return User.objects.filter(
        is_deleted=False,
        is_active=True,
        role__permissions__code="weekly_plan.review",
    ).filter(Q(role__data_scope=Scope.ALL) | Q(zone=rtc.zone) | Q(led_zones=rtc.zone)).distinct()


def _notify_reviewers(plan: WeeklyPlan) -> None:
    link = f"{plan.iso_year}-W{plan.iso_week}"
    late = "tarde" if plan.is_late else "a tiempo"
    for reviewer in _reviewers(plan.rtc):
        _notify(
            reviewer,
            "weekly_plan.submitted",
            "Programación enviada",
            f"{_name(plan.rtc)} envió la semana {plan.iso_week} ({late}).",
            link,
        )


def remind_weekly_plans(now=None) -> int:
    now = now or timezone.now()
    sent = 0
    year, week = target_period(now)
    link = f"{year}-W{week}"
    deadline = deadline_for(year, week)
    remaining = deadline - now
    if remaining.total_seconds() <= 0 or remaining > timedelta(hours=24):
        return 0
    kind = "weekly_plan.reminder_2h" if remaining <= timedelta(hours=2) else "weekly_plan.reminder_24h"
    title = "Faltan 2 horas" if kind.endswith("2h") else "La programación vence mañana"
    rtcs = User.objects.filter(is_deleted=False, is_active=True, role__code="RTC", requires_weekly_plan=True)
    plans = {plan.rtc_id: plan for plan in WeeklyPlan.objects.filter(iso_year=year, iso_week=week, rtc__in=rtcs)}
    for rtc in rtcs:
        plan = plans.get(rtc.id)
        if plan is not None and plan.status in SENT:
            continue
        before = Notification.objects.filter(user=rtc, kind=kind, link=link).exists()
        _notify(rtc, kind, title, "Envía la programación de visitas antes del plazo.", link)
        if not before:
            sent += 1
    return sent


def close_weekly_deadlines(now=None) -> int:
    now = now or timezone.now()
    sent = 0
    year, week = target_period(now)
    if now <= deadline_for(year, week):
        return 0
    link = f"{year}-W{week}"
    rtcs = User.objects.filter(is_deleted=False, is_active=True, role__code="RTC", requires_weekly_plan=True).select_related("zone")
    plans = {plan.rtc_id: plan for plan in WeeklyPlan.objects.filter(iso_year=year, iso_week=week, rtc__in=rtcs)}
    for rtc in rtcs:
        plan = plans.get(rtc.id)
        if plan is not None and plan.status in SENT:
            continue
        before = Notification.objects.filter(user=rtc, kind="weekly_plan.missed", link=link).exists()
        _notify(rtc, "weekly_plan.missed", "No enviaste la programación", "El plazo venció y la semana sigue sin envío.", link)
        if not before:
            sent += 1
            for reviewer in _reviewers(rtc):
                _notify(
                    reviewer,
                    "weekly_plan.missed",
                    "Programación sin envío",
                    f"{_name(rtc)} no envió la semana {week}.",
                    link,
                )
    return sent


def list_plans(user: User, iso_year=None, iso_week=None, rtc_id=None, status=None):
    if not user.has_perm_code("weekly_plan.view"):
        raise NcError("auth.forbidden", "No tienes permiso para ver la programación.", status=403)
    qs = WeeklyPlan.objects.select_related("rtc").prefetch_related("items")
    qs = scope_queryset(qs, user, owner_field="rtc")
    if iso_year:
        qs = qs.filter(iso_year=iso_year)
    if iso_week:
        qs = qs.filter(iso_week=iso_week)
    if rtc_id:
        qs = qs.filter(rtc_id=rtc_id)
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("-iso_year", "-iso_week")
