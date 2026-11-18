import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.prototipo.data import FROZEN_AT
from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed
from apps.visits.models import Visit, VisitStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    seed_prototipo()
    cache.clear()
    return APIClient()


def _auth(api, email="gerencia@naturalcontrol.test"):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_visits_live_default_date(api):
    _auth(api)
    response = api.get("/api/v1/visits/live")
    assert response.status_code == 200
    assert response.data["summary"]["total"] >= 10
    assert any(r["concretado"] > 0 for r in response.data["results"])
    assert any(r.get("gps") for r in response.data["results"])


def test_visits_live_filter_status(api):
    _auth(api)
    response = api.get("/api/v1/visits/live", {"status": "PROGRAMADA"})
    assert response.status_code == 200
    assert all(r["status"] == "PROGRAMADA" for r in response.data["results"])


def test_start_publishes_without_error(api):
    _auth(api, "rtc@naturalcontrol.test")
    visit = Visit.objects.filter(rtc__email="rtc@naturalcontrol.test", status=VisitStatus.PROGRAMADA).first()
    assert visit is not None
    response = api.post(f"/api/v1/visits/{visit.id}/start", {}, format="json")
    assert response.status_code == 200
    assert response.data["status"] == "EN_CURSO"
