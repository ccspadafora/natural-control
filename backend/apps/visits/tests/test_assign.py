import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import Client
from apps.org.models import Zone
from apps.visits.models import Visit, VisitOrigin, VisitReason, VisitStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    return APIClient()


def _auth(api, email="admin@naturalcontrol.test"):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_admin_assigns_a_visit_and_moves_it_to_another_salesperson(api):
    _auth(api)
    zone = Zone.objects.get(code="VALLE")
    other = api.post(
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
    ana = User.objects.get(email="rtc@naturalcontrol.test")
    reason = VisitReason.objects.get(name="Seguimiento comercial")
    created = api.post(
        "/api/v1/visits/assign",
        {
            "client_id": str(client.id),
            "rtc_id": str(ana.id),
            "reason_id": str(reason.id),
            "priority": "ALTA",
            "scheduled_start": "2026-10-20T09:00:00-05:00",
        },
        format="json",
    )
    assert created.status_code == 201
    assert created.data["origin"] == VisitOrigin.ASIGNADA
    visit = Visit.objects.get(id=created.data["id"])
    assert visit.assigned_by.email == "admin@naturalcontrol.test"
    assert visit.rtc_id == ana.id

    listed = api.get("/api/v1/visits")
    assert listed.status_code == 200
    row = next(item for item in listed.data["results"] if item["id"] == str(visit.id))
    assert row["priority"] == "ALTA"
    assert row["rtc_name"] == "Ana Comercial"

    moved = api.post(f"/api/v1/visits/{visit.id}/reassign", {"rtc_id": other.data["id"]}, format="json")
    assert moved.status_code == 200
    visit.refresh_from_db()
    assert str(visit.rtc_id) == other.data["id"]


def test_rtc_cannot_assign_a_visit(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.post("/api/v1/visits/assign", {}, format="json")
    assert response.status_code == 403


def test_a_closed_visit_stays_with_its_salesperson(api):
    _auth(api)
    visit = Visit.objects.filter(status=VisitStatus.REALIZADA).first()
    assert visit is not None
    ana = User.objects.get(email="rtc@naturalcontrol.test")
    response = api.post(f"/api/v1/visits/{visit.id}/reassign", {"rtc_id": str(ana.id)}, format="json")
    assert response.status_code == 409
