from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured

from apps.parameters.models import SystemSetting

CACHE_TTL = 300


def get_setting(key: str):
    cache_key = f"setting:{key}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        setting = SystemSetting.objects.get(key=key, is_deleted=False)
    except SystemSetting.DoesNotExist as exc:
        raise ImproperlyConfigured(f"Falta el parámetro {key}") from exc
    cache.set(cache_key, setting.value, CACHE_TTL)
    return setting.value


def features() -> dict[str, bool]:
    rows = SystemSetting.objects.filter(key__startswith="feature.", is_deleted=False)
    return {row.key.removeprefix("feature."): bool(row.value) for row in rows}
