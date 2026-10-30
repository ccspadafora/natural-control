import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import ClientType
from apps.geo.models import Municipality

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    client = APIClient()
    return client


def _auth(api, email):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_rtc_sees_only_own_clients(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/clients")
    assert response.status_code == 200
    names = {row["name"] for row in response.data["results"]}
    assert "Finca La Esperanza" in names
    assert len(names) == 3


def test_gerencia_sees_the_portfolio(api):
    _auth(api, "gerencia@naturalcontrol.test")
    response = api.get("/api/v1/clients")
    assert response.status_code == 200
    names = {row["name"] for row in response.data["results"]}
    assert "Finca La Esperanza" in names


def test_create_client_requires_consent_and_location(api):
    _auth(api, "rtc@naturalcontrol.test")
    town = Municipality.objects.get(code="05376")
    kind = ClientType.objects.get(name="Agricultor")
    missing = api.post(
        "/api/v1/clients",
        {
            "kind": "PERSONA",
            "legal_name": "Pedro Gómez",
            "client_type_id": str(kind.id),
            "municipality_id": str(town.id),
            "latitude": 6.03,
            "longitude": -75.43,
            "data_consent": False,
        },
        format="json",
    )
    assert missing.status_code == 400
    assert missing.data["code"] == "client.consent_required"

    created = api.post(
        "/api/v1/clients",
        {
            "kind": "PERSONA",
            "legal_name": "Pedro Gómez",
            "client_type_id": str(kind.id),
            "municipality_id": str(town.id),
            "latitude": 6.03,
            "longitude": -75.43,
            "data_consent": True,
        },
        format="json",
    )
    assert created.status_code == 201
    assert created.data["name"] == "Pedro Gómez"
    assert created.data["municipality"] == "La Ceja"

    other = User.objects.get(email="gerencia@naturalcontrol.test")
    api.credentials()
    _auth(api, "rtc@naturalcontrol.test")
    own = api.get("/api/v1/clients")
    assert any(row["name"] == "Pedro Gómez" for row in own.data["results"])
    assert other.email == "gerencia@naturalcontrol.test"
