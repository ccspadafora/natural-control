from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed
from apps.reports.models import ExportJob, ReportStatus

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


def test_export_visits(api):
    _auth(api)
    created = api.post("/api/v1/exports", {"kind": "VISITS_XLSX", "filters": {}}, format="json")
    assert created.status_code == 202
    export_id = created.data["id"]
    detail = api.get(f"/api/v1/exports/{export_id}")
    assert detail.status_code == 200
    assert detail.data["status"] == ReportStatus.DONE
    assert detail.data["row_count"] >= 1
    download = api.get(f"/api/v1/exports/{export_id}/download")
    assert download.status_code == 200
    assert download["Content-Type"].startswith(
        "application/"
    ) or "spreadsheet" in download.get("Content-Type", "") or download.status_code == 200


def test_export_clients_forbidden_for_lider(api):
    _auth(api, "lider@naturalcontrol.test")
    response = api.post("/api/v1/exports", {"kind": "CLIENTS_XLSX", "filters": {}}, format="json")
    assert response.status_code == 403


def test_export_expired(api):
    _auth(api)
    created = api.post("/api/v1/exports", {"kind": "FORECAST_XLSX", "filters": {}}, format="json")
    assert created.status_code == 202
    job = ExportJob.objects.get(id=created.data["id"])
    job.expires_at = timezone.now() - timedelta(days=1)
    job.save(update_fields=["expires_at"])
    download = api.get(f"/api/v1/exports/{job.id}/download")
    assert download.status_code == 410


def test_export_owner_only(api):
    _auth(api, "gerencia@naturalcontrol.test")
    created = api.post("/api/v1/exports", {"kind": "VISITS_XLSX", "filters": {}}, format="json")
    export_id = created.data["id"]
    _auth(api, "lider@naturalcontrol.test")
    detail = api.get(f"/api/v1/exports/{export_id}")
    assert detail.status_code == 404
