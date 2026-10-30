import pytest
from rest_framework.test import APIClient

from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import ClientType
from apps.geo.models import Municipality
from apps.parameters.models import SystemSetting
from apps.sync.models import SyncMutation
from apps.visits.models import Visit

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    client = APIClient()
    return client


def _auth(api, email="rtc@naturalcontrol.test"):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def _visit(name):
    return Visit.objects.select_related("client__zone", "site").get(client__legal_name=name, status="PROGRAMADA")


def test_sync_mutations_idempotent_client_create(api):
    _auth(api)
    mutation_id = "11111111-1111-4111-8111-111111111111"
    body = {
        "kind": "PERSONA",
        "legal_name": "Cliente Offline Uno",
        "client_type_id": str(ClientType.objects.get(name="Agricultor").id),
        "municipality_id": str(Municipality.objects.get(code="05376").id),
        "latitude": 6.03,
        "longitude": -75.43,
        "data_consent": True,
    }
    payload = {
        "mutations": [
            {
                "client_uuid": mutation_id,
                "method": "POST",
                "path": "/api/v1/clients",
                "body": body,
            }
        ]
    }
    first = api.post("/api/v1/sync/mutations", payload, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert first.status_code == 200
    assert first.data["results"][0]["status"] == "APPLIED"
    assert first.data["results"][0]["response"]["legal_name"] == "Cliente Offline Uno"

    second = api.post("/api/v1/sync/mutations", payload, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert second.status_code == 200
    assert second.data["results"][0]["status"] == "APPLIED"
    assert SyncMutation.objects.filter(id=mutation_id).count() == 1


def test_sync_mutations_idempotent_visit_close(api):
    _auth(api)
    visit = _visit("Finca La Esperanza")
    site = visit.site
    lng, lat = site.location.x, site.location.y
    mutation_id = "22222222-2222-4222-8222-222222222222"
    gps = {
        "position": {"type": "Point", "coordinates": [lng, lat]},
        "accuracy_m": 12,
        "captured_at": "2026-10-15T10:00:00-05:00",
        "capture_mode": "OFFLINE",
        "error": "NONE",
    }
    item = {
        "client_uuid": mutation_id,
        "method": "POST",
        "path": f"/api/v1/visits/{visit.id}/close",
        "body": {"result": "SEGUIMIENTO_PROGRAMADO", "notes": "Cierre offline de prueba", "gps": gps},
    }
    first = api.post("/api/v1/sync/mutations", {"mutations": [item]}, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert first.status_code == 200
    assert first.data["results"][0]["status"] == "APPLIED"

    second = api.post("/api/v1/sync/mutations", {"mutations": [item]}, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert second.status_code == 200
    assert second.data["results"][0]["status"] == "APPLIED"
    assert SyncMutation.objects.filter(id=mutation_id).count() == 1
    visit.refresh_from_db()
    assert visit.status == "REALIZADA"


def test_sync_mutations_requires_feature_flag(api):
    _auth(api)
    SystemSetting.objects.filter(key="feature.offline").update(value=False)
    response = api.post(
        "/api/v1/sync/mutations",
        {"mutations": []},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 403
    assert response.data["code"] == "feature.disabled"
