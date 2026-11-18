from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import Crop, CropType
from apps.sync.read import _client_detail

pytestmark = pytest.mark.django_db
User = get_user_model()


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


def test_bootstrap_client_detail_has_crops(api):
    _auth(api)
    from apps.crm.models import Client

    client = Client.objects.filter(is_deleted=False, sites__isnull=False).distinct().first()
    assert client is not None
    site = client.sites.filter(is_deleted=False).first()
    crop_type, _ = CropType.objects.get_or_create(name="Café Sync Test")
    Crop.objects.get_or_create(
        site=site,
        crop_type=crop_type,
        defaults={"area_ha": "1.50", "phase": "PRODUCCION", "recorded_at": date.today()},
    )
    detail = _client_detail(client)
    assert any(c["name"] == "Café Sync Test" for c in detail["crops"])
    assert isinstance(detail["biotechs"], list)
    assert isinstance(detail["history"], list)

    response = api.get("/api/v1/sync/bootstrap", HTTP_X_REQUESTED_WITH="nc")
    assert response.status_code == 200
    clients = response.data.get("clients") or response.data.get("data", {}).get("clients") or []
    # bootstrap shape may nest under entities
    if not clients and "entities" in response.data:
        clients = response.data["entities"].get("clients", [])
    if clients:
        row = next((c for c in clients if str(c.get("id")) == str(client.id)), None)
        if row and "crops" in row:
            assert any(c["name"] == "Café Sync Test" for c in row["crops"])
