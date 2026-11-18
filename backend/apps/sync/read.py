"""HU-10.1 · bootstrap y pull de lectura para Campo offline."""

from __future__ import annotations

import base64
import json
from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.catalog.models import Product
from apps.core.clock import business_now
from apps.core.exceptions import NcError
from apps.core.scoping import scope_queryset
from apps.crm.api import _client_row
from apps.crm.selectors import clients_for
from apps.parameters.models import SystemSetting
from apps.sync.services import require_offline_feature
from apps.visits.api import _visit
from apps.visits.models import Visit


def _encode_cursor(moment) -> str:
    raw = json.dumps({"t": moment.isoformat()}, separators=(",", ":"))
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_cursor(raw: str | None):
    if not raw:
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(raw.encode()).decode())
        parsed = parse_datetime(payload.get("t") or "")
        if parsed is None:
            raise ValueError("bad cursor")
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed
    except Exception as exc:
        raise NcError("sync.invalid", "Cursor de sincronización inválido.", status=400) from exc


def _settings_public() -> dict:
    keys = [
        "feature.offline",
        "feature.demo_mode",
        "gps.tolerance_m",
        "gps.max_accuracy_m",
        "gps.target_accuracy_m",
        "gps.sample_timeout_s",
        "auth.session_idle_days",
    ]
    out = {}
    for key in keys:
        row = SystemSetting.objects.filter(key=key, is_deleted=False).first()
        if row is not None:
            out[key] = row.value
    return out


def _agenda_row(visit, today) -> dict:
    when = timezone.localtime(visit.scheduled_start) if visit.scheduled_start else None
    late = bool(when and when.date() < today and visit.status in {"PROGRAMADA", "EN_CURSO"})
    return {
        "id": str(visit.id),
        "client_id": str(visit.client_id),
        "client_name": visit.client.trade_name or visit.client.legal_name,
        "municipality": visit.site.municipality.name if visit.site_id else "",
        "site": visit.site.name if visit.site_id else "",
        "status": visit.status,
        "reason": visit.reason.name if visit.reason_id else "",
        "scheduled_start": when.isoformat() if when else None,
        "late": late,
        "updated_at": visit.updated_at.isoformat(),
        "is_deleted": visit.is_deleted,
    }


def _client_detail(client) -> dict:
    """Detalle compacto suficiente para ficha/visita offline (sin historial largo)."""
    site = client.sites.filter(is_deleted=False).select_related("municipality").order_by("-is_primary").first()
    sites = []
    if site is not None:
        sites.append(
            {
                "id": str(site.id),
                "name": site.name,
                "municipality": site.municipality.name if site.municipality_id else "",
                "municipality_id": str(site.municipality_id) if site.municipality_id else None,
                "latitude": site.location.y if site.location else None,
                "longitude": site.location.x if site.location else None,
                "location_locked": site.location_locked,
                "is_primary": site.is_primary,
            }
        )
    contact = client.contacts.filter(is_deleted=False, is_primary=True).first() or client.contacts.filter(
        is_deleted=False
    ).first()
    crops = []
    for site_row in client.sites.filter(is_deleted=False).prefetch_related("crops__crop_type"):
        for crop in site_row.crops.filter(is_deleted=False).select_related("crop_type"):
            crops.append(
                {
                    "id": str(crop.id),
                    "name": crop.crop_type.name,
                    "area_ha": float(crop.area_ha),
                    "phase": crop.phase,
                    "site_id": str(site_row.id),
                }
            )
    biotechs = []
    for item in client.biotechs.filter(is_deleted=False).select_related("product"):
        propio = item.product_id is not None
        biotechs.append(
            {
                "id": str(item.id),
                "name": item.product.name if propio else (item.competitor_product or "Biotecnológico"),
                "origin": "Propio" if propio else "Competencia",
                "tone": "primary" if propio else "neutral",
            }
        )
    history = []
    for visit in (
        Visit.objects.filter(client=client, is_deleted=False)
        .select_related("reason")
        .order_by("-scheduled_start")[:12]
    ):
        when = timezone.localtime(visit.scheduled_start) if visit.scheduled_start else None
        label = when.strftime("%d %b.") if when else "—"
        text = visit.reason.name if visit.reason_id else visit.get_status_display()
        history.append({"when": label, "text": f"Visita · {text}"})
    base = _client_row(client)
    base.update(
        {
            "kind": client.kind,
            "document_type": client.document_type,
            "document_number": client.document_number,
            "segment": client.segment,
            "status_label": client.get_commercial_status_display(),
            "client_type": client.client_type.name if client.client_type_id else "",
            "price_list": client.price_list.name if client.price_list_id else None,
            "contact_name": contact.full_name if contact else "",
            "whatsapp_opt_in": bool(contact and contact.whatsapp_opt_in),
            "sites": sites,
            "crops": crops,
            "biotechs": biotechs,
            "history": history,
            "updated_at": client.updated_at.isoformat(),
            "is_deleted": client.is_deleted,
        }
    )
    return base


def _products() -> list[dict]:
    rows = []
    for product in Product.objects.filter(is_deleted=False, is_active=True).order_by("name")[:500]:
        rows.append(
            {
                "id": str(product.id),
                "name": product.name,
                "presentation": product.presentation,
                "unit_price": None,
                "updated_at": product.updated_at.isoformat(),
                "is_deleted": product.is_deleted,
            }
        )
    return rows


def _scoped_visits(user, *, since=None, window_days: int = 30):
    now = business_now()
    start = now - timedelta(days=window_days)
    end = now + timedelta(days=window_days)
    qs = scope_queryset(
        Visit.objects.filter(is_deleted=False).select_related(
            "client", "site__municipality", "reason"
        ),
        user,
        owner_field="rtc",
    ).filter(scheduled_start__gte=start, scheduled_start__lte=end)
    if since is not None:
        # Incluye soft-deletes recientes en ventana amplia
        qs = (
            scope_queryset(Visit.objects.all().select_related("client", "site__municipality", "reason"), user, owner_field="rtc")
            .filter(updated_at__gt=since)
            .filter(scheduled_start__gte=start - timedelta(days=7), scheduled_start__lte=end + timedelta(days=7))
        )
    return qs.order_by("updated_at", "id")


def bootstrap(user) -> dict:
    require_offline_feature()
    today = timezone.localdate(business_now())
    clients = list(clients_for(user)[:300])
    client_rows = [_client_detail(c) for c in clients]
    visits_qs = _scoped_visits(user)
    visit_agenda = []
    visit_details = []
    latest = business_now()
    for visit in visits_qs[:400]:
        visit_agenda.append(_agenda_row(visit, today))
        visit_details.append({**_visit(visit), "updated_at": visit.updated_at.isoformat(), "is_deleted": visit.is_deleted})
        if visit.updated_at > latest:
            latest = visit.updated_at
    for client in clients:
        if client.updated_at > latest:
            latest = client.updated_at

    return {
        "cursor": _encode_cursor(latest),
        "server_time": business_now().isoformat(),
        "me": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.code if user.role_id else None,
            "zone_id": str(user.zone_id) if user.zone_id else None,
        },
        "settings": _settings_public(),
        "clients": client_rows,
        "visits": visit_agenda,
        "visit_details": visit_details,
        "products": _products(),
        "has_more": False,
    }


def pull(user, cursor_raw: str | None) -> dict:
    require_offline_feature()
    since = _decode_cursor(cursor_raw)
    if since is None:
        return bootstrap(user)

    today = timezone.localdate(business_now())
    from apps.crm.models import Client

    clients_qs = list(clients_for(user).filter(updated_at__gt=since).order_by("updated_at", "id")[:200])
    deleted_clients = list(
        Client.objects.filter(owner=user, is_deleted=True, updated_at__gt=since).values_list("id", flat=True)[:100]
    )

    client_changes = [_client_detail(c) for c in clients_qs]
    visits_qs = _scoped_visits(user, since=since)[:200]
    visit_changes = []
    visit_detail_changes = []
    deleted_visits = []
    latest = since
    for visit in visits_qs:
        if visit.updated_at > latest:
            latest = visit.updated_at
        if visit.is_deleted:
            deleted_visits.append(str(visit.id))
            continue
        visit_changes.append(_agenda_row(visit, today))
        visit_detail_changes.append(
            {**_visit(visit), "updated_at": visit.updated_at.isoformat(), "is_deleted": False}
        )

    for client in clients_qs:
        if client.updated_at > latest:
            latest = client.updated_at

    products = [
        {
            "id": str(p.id),
            "name": p.name,
            "presentation": p.presentation,
            "unit_price": None,
            "updated_at": p.updated_at.isoformat(),
            "is_deleted": p.is_deleted,
        }
        for p in Product.objects.filter(updated_at__gt=since).order_by("updated_at")[:200]
    ]
    for p in products:
        # track latest via string compare ISO is ok enough
        pass

    return {
        "cursor": _encode_cursor(latest if latest != since else business_now()),
        "server_time": business_now().isoformat(),
        "changes": {
            "clients": client_changes,
            "visits": visit_changes,
            "visit_details": visit_detail_changes,
            "products": products,
            "settings": _settings_public(),
        },
        "deleted": {
            "clients": [str(i) for i in deleted_clients],
            "visits": deleted_visits,
            "products": [p["id"] for p in products if p["is_deleted"]],
        },
        "has_more": False,
    }
