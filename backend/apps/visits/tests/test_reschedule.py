from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed
from apps.parameters.models import SystemSetting
from apps.visits.models import Visit, VisitStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    seed_prototipo()
    cache.clear()
    SystemSetting.objects.update_or_create(
        key="visits.reschedule_alert_monthly",
        defaults={"value": 2, "value_type": "INT", "module": "visits", "description": "test"},
    )
    return APIClient()


def _auth(api, email="rtc@naturalcontrol.test"):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_reschedule_visit_and_stats(api):
    _auth(api)
    visit = (
        Visit.objects.filter(status=VisitStatus.PROGRAMADA, rtc__email="rtc@naturalcontrol.test", is_deleted=False)
        .order_by("scheduled_start")
        .first()
    )
    assert visit is not None
    new_start = timezone.localtime(visit.scheduled_start) + timedelta(hours=2)
    response = api.post(
        f"/api/v1/visits/{visit.id}/reschedule",
        {"scheduled_start": new_start.isoformat(), "reason": "Cliente pidió más tarde"},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200, response.data
    assert response.data["reschedule_count"] == 1
    visit.refresh_from_db()
    assert visit.reschedule_count == 1

    stats = api.get("/api/v1/visits/reschedule-stats", HTTP_X_REQUESTED_WITH="nc")
    assert stats.status_code == 200
    assert stats.data["mine"]["count"] >= 1
    assert stats.data["threshold"] == 2
