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


def _auth(api, email="rtc@naturalcontrol.test"):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_bootstrap_returns_snapshot(api):
    _auth(api)
    response = api.get("/api/v1/sync/bootstrap")
    assert response.status_code == 200
    assert response.data["cursor"]
    assert response.data["me"]["email"] == "rtc@naturalcontrol.test"
    assert len(response.data["clients"]) >= 1
    assert "products" in response.data
    assert "visits" in response.data
    assert "settings" in response.data


def test_pull_delta_with_cursor(api):
    _auth(api)
    boot = api.get("/api/v1/sync/bootstrap")
    cursor = boot.data["cursor"]
    response = api.get(f"/api/v1/sync/pull?cursor={cursor}")
    assert response.status_code == 200
    assert response.data["cursor"]
    assert "changes" in response.data
    assert "deleted" in response.data


def test_pull_without_cursor_bootstraps(api):
    _auth(api)
    response = api.get("/api/v1/sync/pull")
    assert response.status_code == 200
    assert "clients" in response.data
    assert response.data["me"]["email"] == "rtc@naturalcontrol.test"


def test_bootstrap_requires_offline_feature(api):
    from apps.parameters.models import SystemSetting

    SystemSetting.objects.filter(key="feature.offline").update(value=False)
    cache.clear()
    _auth(api)
    response = api.get("/api/v1/sync/bootstrap")
    assert response.status_code == 403
