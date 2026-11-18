import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import Device
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


def test_admin_health_shape(api):
    _auth(api, "admin@naturalcontrol.test")
    response = api.get("/api/v1/admin/health")
    assert response.status_code == 200
    assert len(response.data["cards"]) == 6
    keys = {c["key"] for c in response.data["cards"]}
    assert keys == {"ses", "erp", "celery", "realtime", "backup", "whatsapp"}
    assert len(response.data["pending_devices"]) >= 2
    wa = next(c for c in response.data["cards"] if c["key"] == "whatsapp")
    assert wa["status"] == "Sin conectar"


def test_admin_health_forbidden_for_rtc(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/admin/health")
    assert response.status_code == 403


def test_revoke_pending_device(api):
    _auth(api, "admin@naturalcontrol.test")
    health = api.get("/api/v1/admin/health")
    device_id = health.data["pending_devices"][0]["id"]
    response = api.post(f"/api/v1/devices/{device_id}/revoke")
    assert response.status_code == 200
    assert response.data["revoked_at"]
    assert not Device.objects.filter(id=device_id, revoked_at__isnull=True).exists()
