import json
from decimal import Decimal, InvalidOperation

from django.core.cache import cache
from django.db import transaction

from apps.audit.services import record
from apps.core.exceptions import NcError
from apps.parameters.models import SystemSetting, ValueType


def _guard(user, code: str) -> None:
    if not user.has_perm_code(code):
        raise NcError("auth.forbidden", "No tienes permiso para esta acción.", status=403)


def list_settings():
    return SystemSetting.objects.filter(is_deleted=False).order_by("module", "key")


def _coerce(setting: SystemSetting, raw):
    kind = setting.value_type
    if kind == ValueType.BOOL:
        if isinstance(raw, bool):
            return raw
        text = str(raw).strip().lower()
        if text in {"1", "true", "si", "sí", "yes"}:
            return True
        if text in {"0", "false", "no"}:
            return False
        raise NcError("setting.invalid", "Elige sí o no.", status=400)
    if kind == ValueType.INT:
        text = str(raw).strip()
        if text.startswith("-"):
            digits = text[1:]
        else:
            digits = text
        if not digits.isdigit():
            raise NcError("setting.invalid", "Este parámetro tiene que ser un número entero.", status=400)
        return int(text)
    if kind == ValueType.DECIMAL:
        try:
            return str(Decimal(str(raw)))
        except (InvalidOperation, TypeError) as exc:
            raise NcError("setting.invalid", "Este parámetro tiene que ser un número.", status=400) from exc
    if kind == ValueType.JSON:
        if isinstance(raw, str):
            try:
                return json.loads(raw)
            except json.JSONDecodeError as exc:
                raise NcError("setting.invalid", "El JSON no se puede leer.", status=400) from exc
        return raw
    return "" if raw is None else str(raw)


@transaction.atomic
def update_setting(actor, key: str, raw) -> SystemSetting:
    _guard(actor, "settings.edit")
    setting = SystemSetting.objects.filter(key=key, is_deleted=False).first()
    if setting is None:
        raise NcError("resource.not_found", "No encontramos ese parámetro.", status=404)
    allowed = setting.editable_by_role or []
    if allowed and actor.role.code not in allowed:
        raise NcError("auth.forbidden", "Tu rol no puede cambiar este parámetro.", status=403)
    before = setting.value
    setting.value = _coerce(setting, raw)
    setting.updated_by = actor
    setting.save(update_fields=["value", "updated_by", "updated_at"])
    cache.delete(f"setting:{setting.key}")
    record(actor, "setting.update", setting, before={"value": before}, after={"value": setting.value})
    return setting
