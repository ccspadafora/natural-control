import pytest
from rest_framework.test import APIClient

from apps.core.seed import DEV_PASSWORD, seed
from apps.parameters.models import SystemSetting

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
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


def test_pipeline_opportunities_disabled(api):
    SystemSetting.objects.filter(key="feature.pipeline").update(value=False)
    _auth(api)
    response = api.get("/api/v1/pipeline/opportunities")
    assert response.status_code == 404
    assert response.data["detail"] == "Función apagada"


def test_whatsapp_conversations_empty(api):
    SystemSetting.objects.filter(key="feature.whatsapp").update(value=True)
    _auth(api, email="gerencia@naturalcontrol.test")
    response = api.get("/api/v1/whatsapp/conversations")
    assert response.status_code == 200
    assert response.data == {"results": []}


def test_erp_status_disabled(api):
    _auth(api, email="admin@naturalcontrol.test")
    response = api.get("/api/v1/erp/status")
    assert response.status_code == 404
    assert response.data["detail"] == "Función apagada"


def test_erp_status_enabled(api):
    SystemSetting.objects.filter(key="feature.erp").update(value=True)
    _auth(api, email="admin@naturalcontrol.test")
    response = api.get("/api/v1/erp/status")
    assert response.status_code == 200
    assert response.data == {"enabled": True, "last_run": None}


def test_ai_reports_empty(api):
    SystemSetting.objects.filter(key="feature.ai_reports").update(value=True)
    _auth(api, email="gerencia@naturalcontrol.test")
    response = api.get("/api/v1/reports/ai")
    assert response.status_code == 200
    assert response.data == {"results": []}


def test_audit_logs_paginated(api):
    _auth(api, email="gerencia@naturalcontrol.test")
    response = api.get("/api/v1/audit/logs")
    assert response.status_code == 200
    assert "results" in response.data
    assert response.data["next"] is None


def test_devices_list(api):
    _auth(api, email="admin@naturalcontrol.test")
    response = api.get("/api/v1/devices")
    assert response.status_code == 200
    assert "results" in response.data
