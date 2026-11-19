import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.prototipo.data import PROTO_RTCS
from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed

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


def test_forecast_totals_near_prototype(api):
    _auth(api)
    response = api.get("/api/v1/forecast")
    assert response.status_code == 200
    expected = sum(int(r["pot"]) for r in PROTO_RTCS)
    # Tolerancia: redondeo al completar gap por horizonte
    assert response.data["totals"]["optimistic"] == pytest.approx(expected, rel=0.05)
    assert response.data["totals"]["probable"] > 0
    assert response.data["totals"]["committed"] > 0
    assert len(response.data["by_rtc"]) >= 10
    assert len(response.data["by_product"]) >= 1
    assert len(response.data["by_month"]) >= 1


def test_forecast_rtc_own_scope(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/forecast")
    assert response.status_code == 200
    assert response.data["by_rtc"] == []
    assert response.data["gap"] is not None
    assert response.data["gap"]["budget"] == 34_000_000


def test_forecast_deals_drilldown(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/forecast/deals")
    assert response.status_code == 200
    assert "deals" in response.data
    assert "summary" in response.data
    assert response.data["summary"]["count"] == len(response.data["deals"])
    assert "totals" in response.data["summary"]
    assert "tips" in response.data["summary"]
    if response.data["deals"]:
        row = response.data["deals"][0]
        for key in (
            "id",
            "product_name",
            "client_id",
            "client_name",
            "total_value",
            "probable_value",
            "visit_id",
            "status",
        ):
            assert key in row
