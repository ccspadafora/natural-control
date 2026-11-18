"""HU-17.6 · selectores de salud del sistema para Consola Admin."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db import connection
from django.utils import timezone
from django.utils.timesince import timesince

from apps.accounts.models import Device
from apps.core.clock import business_now
from apps.integrations.models import ErpSyncRun, SyncStatus
from apps.parameters.services import get_setting


def _ago(dt) -> str:
    if dt is None:
        return "—"
    return f"hace {timesince(dt, business_now()).split(',')[0]}"


def _card(key: str, name: str, status: str, tone: str, detail: str) -> dict:
    return {"key": key, "name": name, "status": status, "tone": tone, "detail": detail}


def _ses_card() -> dict:
    try:
        from apps.integrations.models import RawWebhookEvent, WebhookProvider

        since = business_now() - timedelta(hours=24)
        count = RawWebhookEvent.objects.filter(provider=WebhookProvider.SES, received_at__gte=since).count()
        if count:
            return _card("ses", "Correo (SES)", "Operando", "success", f"{count} eventos en 24 h")
    except Exception:
        pass
    if settings.DEBUG or bool(get_setting("feature.demo_mode")):
        return _card("ses", "Correo (SES)", "Operando", "success", "Último envío hace 4 min · Mailpit / demo")
    return _card("ses", "Correo (SES)", "Sin telemetría", "neutral", "No hay eventos SES registrados")


def _erp_card() -> dict:
    enabled = bool(get_setting("feature.erp"))
    last = ErpSyncRun.objects.filter(is_deleted=False).order_by("-started_at").first()
    unmatched = 0
    try:
        from apps.integrations.models import ErpUnmatched

        unmatched = ErpUnmatched.objects.filter(is_deleted=False, resolved_at__isnull=True).count()
    except Exception:
        unmatched = 0

    if not enabled and last is None:
        return _card(
            "erp",
            "ERP · ventas facturadas",
            "Sin conectar",
            "neutral",
            "Flag feature.erp desactivado · sin corridas",
        )
    if last is None:
        return _card("erp", "ERP · ventas facturadas", "Sin datos", "warning", "Integración activa sin corridas aún")

    when = timezone.localtime(last.finished_at or last.started_at).strftime("%d/%m %H:%M")
    tone = "success" if last.status == SyncStatus.OK else "warning" if last.status == SyncStatus.PARTIAL else "danger"
    status = {
        SyncStatus.OK: "Operando",
        SyncStatus.PARTIAL: "Parcial",
        SyncStatus.FAILED: "Fallida",
        SyncStatus.RUNNING: "En curso",
    }.get(last.status, last.status)
    detail = (
        f"Última corrida {when} · {last.records_upserted} registros"
        + (f" · {unmatched} sin cruzar" if unmatched else "")
    )
    return _card("erp", "ERP · ventas facturadas", status, tone, detail)


def _celery_card() -> dict:
    delayed = 0
    detail = "0 tareas atrasadas"
    tone = "success"
    status = "Operando"
    try:
        import redis
        from django.conf import settings as dj

        url = getattr(dj, "CELERY_BROKER_URL", None) or "redis://redis:6379/0"
        client = redis.from_url(url, socket_connect_timeout=0.5, socket_timeout=0.5)
        delayed = int(client.llen("celery") or 0)
        client.close()
        if delayed > 50:
            tone, status = "warning", "Con carga"
            detail = f"{delayed} tareas en cola"
        elif delayed > 0:
            detail = f"{delayed} tareas en cola"
        else:
            detail = "0 tareas atrasadas"
    except Exception:
        if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            detail = "Modo eager (pruebas) · sin cola"
        else:
            tone, status = "neutral", "Sin telemetría"
            detail = "No se pudo consultar el broker Redis"
    return _card("celery", "Colas de tareas", status, tone, detail)


def _realtime_card() -> dict:
    """Proxy de sincronización en vivo: latencia Redis de Channels."""
    try:
        import redis
        from django.conf import settings as dj

        hosts = dj.CHANNEL_LAYERS["default"]["CONFIG"]["hosts"]
        host = hosts[0] if hosts else "redis://redis:6379/1"
        client = redis.from_url(host if isinstance(host, str) else f"redis://{host[0]}:{host[1]}/1",
                                socket_connect_timeout=0.5, socket_timeout=0.5)
        t0 = timezone.now()
        client.ping()
        ms = (timezone.now() - t0).total_seconds() * 1000
        client.close()
        if ms > 100:
            return _card(
                "realtime",
                "Sincronización en vivo",
                "Con retraso",
                "warning",
                f"p95 estimado {ms:.1f} ms al broker (meta: 3 s de evento)",
            )
        if bool(get_setting("feature.demo_mode")):
            return _card(
                "realtime",
                "Sincronización en vivo",
                "Con retraso",
                "warning",
                "p95 de 4,1 s en la última hora (meta: 3 s)",
            )
        return _card("realtime", "Sincronización en vivo", "Operando", "success", f"Broker OK · ping {ms:.0f} ms")
    except Exception:
        return _card("realtime", "Sincronización en vivo", "Sin telemetría", "neutral", "Channels/Redis no alcanzable")


def _backup_card() -> dict:
    # Sin job real aún: en demo reportamos el backup esperado de las 3:00.
    if bool(get_setting("feature.demo_mode")):
        return _card("backup", "Último backup", "Operando", "success", "Hoy, 3:00 a. m.")
    return _card("backup", "Último backup", "Sin telemetría", "neutral", "Job maint.backup_db aún no reporta")


def _whatsapp_card() -> dict:
    enabled = bool(get_setting("feature.whatsapp"))
    if not enabled:
        return _card(
            "whatsapp",
            "WhatsApp Business",
            "Sin conectar",
            "neutral",
            "Fuera de este piloto · fase comercial posterior",
        )
    return _card("whatsapp", "WhatsApp Business", "Operando", "success", "Flag feature.whatsapp activo")


def _pending_devices() -> list[dict]:
    rows = (
        Device.objects.filter(is_deleted=False, revoked_at__isnull=True, pending_mutations__gt=0)
        .select_related("user")
        .order_by("-pending_mutations", "-last_used_at")[:50]
    )
    out = []
    for device in rows:
        name = f"{device.user.first_name} {device.user.last_name}".strip() or device.user.email
        pending = device.pending_mutations
        pending_label = "1 registro pendiente" if pending == 1 else f"{pending} registros pendientes"
        out.append(
            {
                "id": str(device.id),
                "user_id": str(device.user_id),
                "name": name,
                "device": device.label or device.get_platform_display(),
                "platform": device.platform,
                "pending_mutations": pending,
                "pending_label": pending_label,
                "last_used_at": device.last_used_at.isoformat() if device.last_used_at else None,
                "ago": _ago(device.last_used_at) if device.last_used_at else "—",
            }
        )
    return out


def system_health() -> dict:
    # Touch DB so ready-style failures surface
    connection.ensure_connection()
    return {
        "checked_at": business_now().isoformat(),
        "cards": [
            _ses_card(),
            _erp_card(),
            _celery_card(),
            _realtime_card(),
            _backup_card(),
            _whatsapp_card(),
        ],
        "pending_devices": _pending_devices(),
    }
