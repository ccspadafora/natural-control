from calendar import monthrange
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from apps.accounts.models import User
from apps.audit.services import record
from apps.catalog.models import Product
from apps.catalog.services import resolve_unit_price
from apps.core.exceptions import NcError
from apps.core.scoping import scope_queryset
from apps.crm.selectors import client_for
from apps.parameters.services import get_setting
from apps.visits.gps import verify_gps
from apps.visits.models import (
    GpsCheck,
    GpsKind,
    GpsStatus,
    Horizon,
    ProductKind,
    ReviewStatus,
    Visit,
    VisitOrigin,
    VisitPriority,
    VisitProduct,
    VisitReason,
    VisitResult,
    VisitStatus,
)
from apps.visits.realtime import publish_visit


def schedule_visit(user, data: dict) -> tuple[Visit, str | None]:
    if not user.has_perm_code("visits.create"):
        raise NcError("auth.forbidden", "No tienes permiso para agendar visitas.", status=403)
    client = client_for(user, data.get("client_id"))
    site = client.sites.filter(id=data.get("site_id"), is_deleted=False).first()
    if site is None:
        site = client.sites.filter(is_deleted=False, is_primary=True).first()
    if site is None:
        raise NcError("visit.site_required", "El cliente no tiene sede.", status=400)
    start = parse_datetime(str(data.get("scheduled_start") or ""))
    if start is None:
        raise NcError("visit.invalid", "Elige fecha y hora.", status=400)
    if timezone.is_naive(start):
        start = timezone.make_aware(start, timezone.get_current_timezone())
    end = start + timedelta(minutes=int(data.get("duration_minutes") or 60))
    reason = None
    if data.get("reason_id"):
        reason = VisitReason.objects.filter(id=data["reason_id"], is_deleted=False, is_active=True).first()
    overlap = Visit.objects.filter(
        rtc=user,
        is_deleted=False,
        status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO],
        scheduled_start__lt=end,
        scheduled_end__gt=start,
    ).exists()
    visit = Visit.objects.create(
        client=client,
        site=site,
        rtc=user,
        origin=VisitOrigin.RTC,
        reason=reason,
        scheduled_start=start,
        scheduled_end=end,
        status=VisitStatus.PROGRAMADA,
        created_by=user,
        updated_by=user,
    )
    warning = "Se cruza con otra visita tuya. Puedes dejarla así." if overlap else None
    return visit, warning


def open_visits(user):
    return scope_queryset(
        Visit.objects.filter(
            is_deleted=False,
            status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO],
        ).select_related("client", "site__municipality", "reason", "rtc"),
        user,
        owner_field="rtc",
    ).order_by("scheduled_start")


def _rtc(rtc_id) -> User:
    rtc = User.objects.filter(id=rtc_id, is_deleted=False, is_active=True).select_related("role").first()
    if rtc is None or rtc.role.code != "RTC":
        raise NcError("visit.rtc", "Elige un comercial activo.", status=400)
    return rtc


def _slot(data: dict):
    start = parse_datetime(str(data.get("scheduled_start") or ""))
    if start is None:
        raise NcError("visit.invalid", "Elige fecha y hora.", status=400)
    if timezone.is_naive(start):
        start = timezone.make_aware(start, timezone.get_current_timezone())
    end = start + timedelta(minutes=int(data.get("duration_minutes") or 60))
    return start, end


@transaction.atomic
def assign_visit(actor, data: dict) -> tuple[Visit, str | None]:
    if not actor.has_perm_code("visits.assign"):
        raise NcError("auth.forbidden", "No tienes permiso para asignar visitas.", status=403)
    client = client_for(actor, data.get("client_id"))
    site = client.sites.filter(id=data.get("site_id"), is_deleted=False).first()
    if site is None:
        site = client.sites.filter(is_deleted=False, is_primary=True).first()
    if site is None:
        raise NcError("visit.site_required", "El cliente no tiene sede.", status=400)
    rtc = _rtc(data.get("rtc_id"))
    start, end = _slot(data)
    priority = data.get("priority") or VisitPriority.MEDIA
    if priority not in VisitPriority.values:
        raise NcError("visit.invalid", "Elige la prioridad.", status=400)
    reason = None
    if data.get("reason_id"):
        reason = VisitReason.objects.filter(id=data["reason_id"], is_deleted=False, is_active=True).first()
    overlap = Visit.objects.filter(
        rtc=rtc,
        is_deleted=False,
        status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO],
        scheduled_start__lt=end,
        scheduled_end__gt=start,
    ).exists()
    visit = Visit.objects.create(
        client=client,
        site=site,
        rtc=rtc,
        assigned_by=actor,
        origin=VisitOrigin.ASIGNADA,
        reason=reason,
        priority=priority,
        scheduled_start=start,
        scheduled_end=end,
        status=VisitStatus.PROGRAMADA,
        created_by=actor,
        updated_by=actor,
    )
    record(actor, "visit.assign", visit, after={"rtc": str(rtc.id), "origin": visit.origin})
    transaction.on_commit(lambda: publish_visit("visit.assigned", visit))
    warning = "Se cruza con otra visita de ese comercial. Puedes dejarla así." if overlap else None
    return visit, warning


@transaction.atomic
def reassign_visit(actor, visit_id, rtc_id) -> Visit:
    if not actor.has_perm_code("visits.assign"):
        raise NcError("auth.forbidden", "No tienes permiso para asignar visitas.", status=403)
    visit = Visit.objects.select_for_update().select_related("client", "site").get(id=visit_for(actor, visit_id).id)
    _open(visit)
    rtc = _rtc(rtc_id)
    visit.rtc = rtc
    visit.assigned_by = actor
    visit.updated_by = actor
    visit.save(update_fields=["rtc", "assigned_by", "updated_by", "updated_at"])
    record(actor, "visit.reassign", visit, after={"rtc": str(rtc.id)})
    transaction.on_commit(lambda: publish_visit("visit.assigned", visit))
    return visit


def agenda(user, day: datetime, view: str):
    from apps.core.scoping import scope_queryset

    qs = scope_queryset(
        Visit.objects.filter(is_deleted=False).select_related("client", "site__municipality", "reason"),
        user,
        owner_field="rtc",
    )
    local = timezone.localtime(day)
    start = local.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    if view == "pending":
        qs = qs.filter(status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO], scheduled_start__lt=end)
    elif view == "done":
        qs = qs.filter(status=VisitStatus.REALIZADA, scheduled_start__gte=start, scheduled_start__lt=end)
    else:
        qs = qs.filter(scheduled_start__gte=start, scheduled_start__lt=end).exclude(status=VisitStatus.CANCELADA)
    return qs.order_by("scheduled_start")


def visit_for(user, visit_id) -> Visit:
    visit = (
        scope_queryset(
            Visit.objects.filter(is_deleted=False).select_related("client__zone", "site__municipality", "reason"),
            user,
            owner_field="rtc",
        )
        .filter(id=visit_id)
        .first()
    )
    if visit is None:
        raise NcError("resource.not_found", "No encontramos esa visita.", status=404)
    return visit


def _open(visit: Visit) -> None:
    if visit.status not in {VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO}:
        raise NcError("visit.closed", "Esta visita ya quedó cerrada.", status=409)


def start_visit(user, visit_id, gps: dict | None) -> Visit:
    if not user.has_perm_code("visits.execute"):
        raise NcError("auth.forbidden", "No tienes permiso para registrar visitas.", status=403)
    visit = visit_for(user, visit_id)
    _open(visit)
    if visit.status == VisitStatus.PROGRAMADA:
        visit.status = VisitStatus.EN_CURSO
        visit.started_at = timezone.now()
        visit.updated_by = user
        visit.save(update_fields=["status", "started_at", "updated_by", "updated_at"])
    if gps:
        verify_gps(visit, gps, GpsKind.START)
    record(user, "visit.transition", visit, after={"status": visit.status})
    return visit


def register_now(user, client_id) -> Visit:
    if not user.has_perm_code("visits.execute"):
        raise NcError("auth.forbidden", "No tienes permiso para registrar visitas.", status=403)
    client = client_for(user, client_id)
    site = client.sites.filter(is_deleted=False, is_primary=True).first() or client.sites.filter(is_deleted=False).first()
    if site is None:
        raise NcError("visit.site_required", "El cliente no tiene sede.", status=400)
    now = timezone.now()
    visit = Visit.objects.create(
        client=client,
        site=site,
        rtc=user,
        origin=VisitOrigin.RTC,
        scheduled_start=now,
        scheduled_end=now + timedelta(minutes=60),
        status=VisitStatus.EN_CURSO,
        started_at=now,
        created_by=user,
        updated_by=user,
    )
    record(user, "visit.transition", visit, after={"status": visit.status})
    return visit


def _expected_date(horizon: str, raw: str | None):
    today = timezone.localdate()
    if horizon == Horizon.CORTO:
        proposed = today + timedelta(days=(6 - today.weekday()))
    elif horizon == Horizon.MEDIANO:
        proposed = today.replace(day=monthrange(today.year, today.month)[1])
    else:
        proposed = parse_date(raw or "")
        if proposed is None:
            raise NcError("visit.horizon", "En un potencial de largo plazo elige el mes.", status=400)
    if raw and horizon != Horizon.LARGO:
        chosen = parse_date(raw)
        if chosen is not None:
            proposed = chosen
    limits = get_setting("forecast.horizon_max_days")
    cap = int(limits.get(horizon, 90))
    if (proposed - today).days > cap:
        raise NcError("visit.horizon", "La fecha queda por fuera del horizonte elegido.", status=400)
    if proposed < today:
        raise NcError("visit.horizon", "La fecha del potencial no puede ser anterior a hoy.", status=400)
    return proposed


def _save_products(visit: Visit, lines: list) -> None:
    VisitProduct.objects.filter(visit=visit).delete()
    probabilities = get_setting("forecast.default_probability")
    for line in lines or []:
        product = Product.objects.filter(id=line.get("product_id"), is_deleted=False, is_active=True).first()
        if product is None:
            raise NcError("visit.product", "Elige un producto de la lista del cliente.", status=400)
        kind = line.get("kind")
        if kind not in ProductKind.values:
            raise NcError("visit.product", "Indica si la línea es concretada o potencial.", status=400)
        try:
            quantity = Decimal(str(line.get("quantity")))
        except Exception as exc:
            raise NcError("visit.product", "Escribe la cantidad.", status=400) from exc
        if quantity <= 0:
            raise NcError("visit.product", "La cantidad tiene que ser mayor que cero.", status=400)
        price = line.get("unit_price")
        if price in (None, ""):
            resolved = resolve_unit_price(visit.client, product)
            if resolved is None:
                raise NcError("visit.product", f"{product.name} no tiene precio en la lista del cliente.", status=400)
            unit_price = resolved
        else:
            unit_price = Decimal(str(price))
        horizon = None
        expected = None
        probability = 100 if kind == ProductKind.CONCRETADO else None
        if kind == ProductKind.POTENCIAL:
            horizon = line.get("horizon")
            if horizon not in Horizon.values:
                raise NcError("visit.horizon", "El potencial necesita horizonte: corto, mediano o largo.", status=400)
            expected = _expected_date(horizon, line.get("expected_date"))
            probability = int(probabilities.get(horizon, 20))
        VisitProduct.objects.create(
            visit=visit,
            product=product,
            kind=kind,
            quantity=quantity,
            unit=product.unit,
            unit_price=unit_price,
            total_value=(quantity * unit_price).quantize(Decimal("0.01")),
            horizon=horizon,
            expected_date=expected,
            probability=probability,
            target_area_ha=line.get("target_area_ha") or None,
        )


def _finish(user, visit: Visit, gps: dict | None, status: str) -> GpsCheck:
    check = verify_gps(visit, gps, GpsKind.CLOSE)
    visit.status = status
    visit.completed_at = timezone.now()
    visit.server_received_at = timezone.now()
    visit.updated_by = user
    visit.save(update_fields=["status", "completed_at", "server_received_at", "updated_by", "updated_at", "result", "notes", "agreements", "contact_name_free", "not_done_reason"])
    record(user, "visit.transition", visit, after={"status": status, "gps": check.status})
    transaction.on_commit(lambda: publish_visit("visit.closed", visit, check))
    if check.status not in {GpsStatus.VERIFICADA, GpsStatus.SIN_REFERENCIA}:
        transaction.on_commit(lambda: publish_visit("gps.discrepancy", visit, check))
    return check


@transaction.atomic
def close_visit(user, visit_id, data: dict) -> tuple[Visit, GpsCheck]:
    if not user.has_perm_code("visits.execute"):
        raise NcError("auth.forbidden", "No tienes permiso para registrar visitas.", status=403)
    visit = Visit.objects.select_for_update().select_related("client__zone", "site").get(id=visit_for(user, visit_id).id)
    _open(visit)
    result = data.get("result")
    if result not in VisitResult.values:
        raise NcError("visit.result", "Elige el resultado de la visita.", status=400)
    _save_products(visit, data.get("products") or [])
    if result == VisitResult.PEDIDO_CONFIRMADO and not visit.products.filter(kind=ProductKind.CONCRETADO).exists():
        raise NcError("visit.product", "Un pedido confirmado necesita al menos un producto concretado.", status=400)
    visit.result = result
    visit.notes = (data.get("notes") or "").strip()
    visit.agreements = (data.get("agreements") or "").strip()
    visit.contact_name_free = (data.get("contact_name_free") or "").strip()
    check = _finish(user, visit, data.get("gps"), VisitStatus.REALIZADA)
    return visit, check


@transaction.atomic
def mark_not_done(user, visit_id, data: dict) -> tuple[Visit, GpsCheck]:
    if not user.has_perm_code("visits.execute"):
        raise NcError("auth.forbidden", "No tienes permiso para registrar visitas.", status=403)
    visit = Visit.objects.select_for_update().select_related("client__zone", "site").get(id=visit_for(user, visit_id).id)
    _open(visit)
    reason = (data.get("reason") or "").strip()
    if len(reason) < 3:
        raise NcError("visit.reason", "Cuéntanos por qué no se realizó.", status=400)
    visit.not_done_reason = reason
    visit.result = None
    check = _finish(user, visit, data.get("gps"), VisitStatus.NO_REALIZADA)
    return visit, check


def review_check(user, check_id, review_status: str, note: str) -> GpsCheck:
    if not user.has_perm_code("gps.review"):
        raise NcError("auth.forbidden", "No tienes permiso para revisar la ubicación.", status=403)
    allowed = {ReviewStatus.JUSTIFICADA, ReviewStatus.RECHAZADA, ReviewStatus.INFORMACION_SOLICITADA}
    if review_status not in allowed:
        raise NcError("gps.review", "Marca la visita como justificada, rechazada o solicita más información.", status=400)
    if len((note or "").strip()) < 3:
        raise NcError("gps.review", "Escribe una nota para la revisión.", status=400)
    check = (
        GpsCheck.objects.select_related("visit__client", "visit__rtc", "visit__site")
        .filter(id=check_id, is_deleted=False)
        .first()
    )
    if check is None or visit_for(user, check.visit_id).id != check.visit_id:
        raise NcError("resource.not_found", "No encontramos esa verificación.", status=404)
    if check.status == GpsStatus.VERIFICADA:
        raise NcError("gps.review", "Esta visita ya quedó verificada.", status=409)
    check.review_status = review_status
    check.review_note = note.strip()
    check.reviewed_by = user
    check.reviewed_at = timezone.now()
    check.updated_by = user
    check.save(update_fields=["review_status", "review_note", "reviewed_by", "reviewed_at", "updated_by", "updated_at"])
    record(user, "gps.review", check, after={"review_status": review_status})
    return check
