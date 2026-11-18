import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    seed_prototipo()
    cache.clear()
    return APIClient()


def _auth(api, email):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_team_metrics_gerencia(api):
    _auth(api, "gerencia@naturalcontrol.test")
    response = api.get("/api/v1/metrics/team")
    assert response.status_code == 200
    assert response.data["totals"]["budget"] > 0
    assert len(response.data["rtcs"]) >= 10
    assert "gps_pending" in response.data["attention"]


def test_team_metrics_lider_scoped(api):
    _auth(api, "lider@naturalcontrol.test")
    response = api.get("/api/v1/metrics/team")
    assert response.status_code == 200
    zones = {r["zone"] for r in response.data["rtcs"]}
    assert zones <= {"Oriente antioqueño", "Eje Cafetero"}


def test_team_metrics_rtc_forbidden(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/metrics/team")
    assert response.status_code == 403


def test_zone_metrics(api):
    _auth(api, "gerencia@naturalcontrol.test")
    response = api.get("/api/v1/metrics/zones")
    assert response.status_code == 200
    assert len(response.data["results"]) >= 6
    ori = next(z for z in response.data["results"] if z["code"] == "ORIENTE")
    assert "ANT" in ori["departments"]
