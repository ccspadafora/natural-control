"""Reloj de negocio: en demo usa demo.frozen_at; si no, la hora real del servidor."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.parameters.services import get_setting

BOGOTA = ZoneInfo("America/Bogota")


def business_now() -> datetime:
    try:
        if not get_setting("feature.demo_mode"):
            return timezone.now()
        raw = get_setting("demo.frozen_at")
    except ImproperlyConfigured:
        return timezone.now()
    if not raw:
        return timezone.now()
    parsed = parse_datetime(str(raw))
    if parsed is None:
        return timezone.now()
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, BOGOTA)
    return parsed


def business_today() -> date:
    return timezone.localtime(business_now()).date()
