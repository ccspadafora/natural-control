import pytest
from django.core.cache import cache
from django.utils import timezone

from apps.core.clock import business_now, business_today
from apps.core.prototipo.data import FROZEN_AT
from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import seed
from apps.parameters.models import SystemSetting

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _base():
    seed()
    seed_prototipo()
    cache.clear()


def test_business_now_uses_frozen_at_in_demo():
    assert business_today() == FROZEN_AT.date()
    assert abs((business_now() - FROZEN_AT).total_seconds()) < 1


def test_business_now_real_when_demo_off():
    SystemSetting.objects.filter(key="feature.demo_mode").update(value=False)
    cache.delete("setting:feature.demo_mode")
    assert business_today() == timezone.localdate()
