import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import Client
from apps.org.models import Zone

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    return APIClient()


def _auth(api, email):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_admin_invites_a_salesperson_and_cannot_drop_one_with_clients(api):
    _auth(api, "admin@naturalcontrol.test")
    zone = Zone.objects.get(code="ORIENTE")
    created = api.post(
        "/api/v1/users",
        {
            "first_name": "Luis",
            "last_name": "Campo",
            "email": "luis@naturalcontrol.test",
            "role": "RTC",
            "zone_id": str(zone.id),
        },
        format="json",
    )
    assert created.status_code == 201
    assert len(mail.outbox) == 1
    assert "luis@naturalcontrol.test" in mail.outbox[0].body

    ana = api.get("/api/v1/users").data["results"]
    ana_id = next(row["id"] for row in ana if row["email"] == "rtc@naturalcontrol.test")
    blocked = api.post(f"/api/v1/users/{ana_id}/deactivate")
    assert blocked.status_code == 409
    assert blocked.data["code"] == "user.has_clients"


def test_rtc_cannot_manage_users(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/users")
    assert response.status_code == 403


def test_reassign_moves_the_client(api):
    _auth(api, "admin@naturalcontrol.test")
    zone = Zone.objects.get(code="VALLE")
    created = api.post(
        "/api/v1/users",
        {
            "first_name": "Marta",
            "last_name": "Valle",
            "email": "marta@naturalcontrol.test",
            "role": "RTC",
            "zone_id": str(zone.id),
        },
        format="json",
    )
    client = Client.objects.get(legal_name="Finca La Esperanza")
    moved = api.post(
        "/api/v1/clients/reassign",
        {"client_ids": [str(client.id)], "owner_id": created.data["id"]},
        format="json",
    )
    assert moved.status_code == 200
    client.refresh_from_db()
    assert client.owner.email == "marta@naturalcontrol.test"
    assert client.zone.code == "VALLE"
