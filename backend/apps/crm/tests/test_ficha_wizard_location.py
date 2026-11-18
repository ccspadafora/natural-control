import pytest
from rest_framework.test import APIClient

from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import Client, Crop, CropPhase, LocationChangeRequest, LocationRequestStatus, Site
from apps.crm.models import ClientType
from apps.geo.models import Municipality

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
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_client_detail_includes_crops_bio_history(api):
    _auth(api, "rtc@naturalcontrol.test")
    listing = api.get("/api/v1/clients")
    assert listing.status_code == 200
    client_id = listing.data["results"][0]["id"]
    detail = api.get(f"/api/v1/clients/{client_id}")
    assert detail.status_code == 200
    assert "crops" in detail.data
    assert "biotechs" in detail.data
    assert "history" in detail.data
    assert "status_label" in detail.data
    assert "sites" in detail.data
    assert detail.data["sites"]


def test_create_client_wizard_payload_with_crops(api):
    _auth(api, "rtc@naturalcontrol.test")
    town = Municipality.objects.get(code="05376")
    kind = ClientType.objects.get(name="Agricultor")
    crop_types = api.get("/api/v1/crop-types")
    assert crop_types.status_code == 200
    crop_type_id = crop_types.data["results"][0]["id"] if crop_types.data["results"] else None

    body = {
        "kind": "EMPRESA",
        "legal_name": "Cultivos Paridad SAS",
        "document_type": "NIT",
        "document_number": "901998877",
        "client_type_id": str(kind.id),
        "municipality_id": str(town.id),
        "site_name": "Finca El Ensayo",
        "contact_name": "Andrea Restrepo",
        "phone": "3105550192",
        "latitude": 6.031,
        "longitude": -75.4302,
        "accuracy_m": 8,
        "location_source": "GPS_DEVICE",
        "data_consent": True,
        "whatsapp_opt_in": True,
        "crops": (
            [{"crop_type_id": crop_type_id, "area_ha": 12, "phase": "PRODUCCION"}] if crop_type_id else [{"name": "Aguacate", "area_ha": 12, "phase": "SIEMBRA"}]
        ),
        "biotechs": [{"competitor_product": "Bacillus subtilis genérico"}],
    }
    created = api.post("/api/v1/clients", body, format="json")
    assert created.status_code == 201, created.data
    client = Client.objects.get(id=created.data["id"])
    site = client.sites.get(is_primary=True)
    assert site.name == "Finca El Ensayo"
    assert site.location_locked is True
    assert client.contacts.filter(is_primary=True, whatsapp_opt_in=True).exists()
    assert Crop.objects.filter(site=site).count() >= 1
    crop = Crop.objects.filter(site=site).first()
    assert crop.phase in {CropPhase.PRODUCCION, CropPhase.SIEMBRA}
    assert client.biotechs.filter(competitor_product="Bacillus subtilis genérico").exists()

    detail = api.get(f"/api/v1/clients/{client.id}")
    assert detail.status_code == 200
    assert detail.data["contact_name"] == "Andrea Restrepo"
    assert detail.data["crops"]
    assert detail.data["biotechs"]


def test_location_change_request_and_approve(api):
    _auth(api, "rtc@naturalcontrol.test")
    client = Client.objects.filter(owner__email="rtc@naturalcontrol.test", is_deleted=False).first()
    site = client.sites.filter(is_primary=True, is_deleted=False).first()
    assert site is not None

    created = api.post(
        "/api/v1/location-changes/create",
        {
            "site_id": str(site.id),
            "latitude": 6.04,
            "longitude": -75.44,
            "accuracy_m": 12,
            "reason": "La sede se mudó a la bodega del pueblo",
        },
        format="json",
    )
    assert created.status_code == 201, created.data
    assert created.data["status"] == LocationRequestStatus.PENDIENTE
    request_id = created.data["id"]

    duplicate = api.post(
        "/api/v1/location-changes/create",
        {
            "site_id": str(site.id),
            "latitude": 6.041,
            "longitude": -75.441,
            "reason": "Segundo intento no debe pasar",
        },
        format="json",
    )
    assert duplicate.status_code == 409

    api.credentials()
    _auth(api, "gerencia@naturalcontrol.test")
    listing = api.get("/api/v1/location-changes")
    assert listing.status_code == 200
    assert listing.data["pending"] >= 1
    assert any(row["id"] == request_id for row in listing.data["results"])

    approved = api.post(
        f"/api/v1/location-changes/{request_id}/decide",
        {"status": "APROBADA", "decision_note": "Confirmado en campo"},
        format="json",
    )
    assert approved.status_code == 200, approved.data
    assert approved.data["status"] == LocationRequestStatus.APROBADA

    site.refresh_from_db()
    assert abs(site.location.y - 6.04) < 0.0001
    assert abs(site.location.x - (-75.44)) < 0.0001
    assert site.location_locked is True
    assert LocationChangeRequest.objects.get(id=request_id).status == LocationRequestStatus.APROBADA


def test_location_change_reject_requires_note(api):
    _auth(api, "rtc@naturalcontrol.test")
    client = Client.objects.filter(owner__email="rtc@naturalcontrol.test", is_deleted=False).first()
    site = Site.objects.filter(client=client, is_deleted=False).first()
    created = api.post(
        "/api/v1/location-changes/create",
        {
            "site_id": str(site.id),
            "latitude": 6.05,
            "longitude": -75.45,
            "reason": "Punto GPS malo en el alta",
        },
        format="json",
    )
    assert created.status_code == 201
    request_id = created.data["id"]

    api.credentials()
    _auth(api, "gerencia@naturalcontrol.test")
    rejected = api.post(
        f"/api/v1/location-changes/{request_id}/decide",
        {"status": "RECHAZADA", "decision_note": ""},
        format="json",
    )
    assert rejected.status_code == 400
    assert rejected.data["code"] == "location.note_required"
