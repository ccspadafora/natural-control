import base64
from io import BytesIO

import pytest
from django.core.cache import cache
from PIL import Image
from rest_framework.test import APIClient

from apps.core.seed import DEV_PASSWORD, seed
from apps.parameters.models import SystemSetting
from apps.sync.models import SyncMutation
from apps.visits.models import Evidence, Visit

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    SystemSetting.objects.filter(key="feature.offline").update(value=True)
    cache.delete("setting:feature.offline")
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


def _visit():
    return Visit.objects.filter(status="PROGRAMADA", client__owner__email="rtc@naturalcontrol.test").order_by("created_at").first()


def _jpeg_b64() -> str:
    image = Image.new("RGB", (64, 48), color=(20, 140, 60))
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def test_sync_evidence_photo_offline(api):
    _auth(api)
    visit = _visit()
    assert visit is not None
    mutation_id = "33333333-3333-4333-8333-333333333333"
    item = {
        "client_uuid": mutation_id,
        "method": "POST",
        "path": f"/api/v1/visits/{visit.id}/evidence",
        "body": {
            "filename": "parcela.jpg",
            "content_type": "image/jpeg",
            "data_base64": _jpeg_b64(),
        },
    }
    first = api.post("/api/v1/sync/mutations", {"mutations": [item]}, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert first.status_code == 200, first.data
    assert first.data["results"][0]["status"] == "APPLIED"
    assert first.data["results"][0]["response"]["id"]
    assert Evidence.objects.filter(visit=visit, is_deleted=False).count() >= 1

    second = api.post("/api/v1/sync/mutations", {"mutations": [item]}, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert second.status_code == 200
    assert second.data["results"][0]["status"] == "APPLIED"
    assert SyncMutation.objects.filter(id=mutation_id).count() == 1


def test_sync_start_visit_offline(api):
    _auth(api)
    visit = _visit()
    assert visit is not None
    site = visit.site
    mutation_id = "44444444-4444-4444-8444-444444444444"
    gps = {
        "position": {"type": "Point", "coordinates": [site.location.x, site.location.y]},
        "accuracy_m": 10,
        "captured_at": "2026-10-15T10:00:00-05:00",
        "capture_mode": "OFFLINE",
        "error": "NONE",
    }
    item = {
        "client_uuid": mutation_id,
        "method": "POST",
        "path": f"/api/v1/visits/{visit.id}/start",
        "body": {"gps": gps},
    }
    response = api.post("/api/v1/sync/mutations", {"mutations": [item]}, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert response.status_code == 200, response.data
    assert response.data["results"][0]["status"] == "APPLIED"
    visit.refresh_from_db()
    assert visit.status == "EN_CURSO"
