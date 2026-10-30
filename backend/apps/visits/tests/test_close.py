import pytest
from django.db import connection
from rest_framework.test import APIClient

from apps.catalog.models import Product
from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import Site
from apps.visits.gps import verify_gps
from apps.visits.models import GpsKind, GpsStatus, Visit

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


def _shift(lng, lat, meters):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT ST_X(g), ST_Y(g)
            FROM (
              SELECT ST_Project(ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, 0)::geometry AS g
            ) q
            """,
            [lng, lat, meters],
        )
        return cursor.fetchone()


def _visit(name):
    return Visit.objects.select_related("client__zone", "site").get(client__legal_name=name, status="PROGRAMADA")


def _payload(lng, lat, accuracy=12, error="NONE"):
    return {
        "position": {"type": "Point", "coordinates": [lng, lat]},
        "accuracy_m": accuracy,
        "captured_at": "2026-10-15T10:00:00-05:00",
        "capture_mode": "ONLINE",
        "error": error,
    }


def test_distance_thresholds():
    seed()
    visit = _visit("Finca La Esperanza")
    site = visit.site
    lng, lat = site.location.x, site.location.y

    same = verify_gps(visit, _payload(lng, lat), GpsKind.CLOSE)
    assert same.status == GpsStatus.VERIFICADA
    assert same.distance_m < 1

    near_lng, near_lat = _shift(lng, lat, 999)
    near = verify_gps(visit, _payload(near_lng, near_lat), GpsKind.CLOSE)
    assert near.status == GpsStatus.VERIFICADA
    assert 990 <= near.distance_m <= 1008

    far_lng, far_lat = _shift(lng, lat, 1001)
    far = verify_gps(visit, _payload(far_lng, far_lat), GpsKind.CLOSE)
    assert far.status == GpsStatus.FUERA_DE_RANGO
    assert far.review_status == "PENDIENTE"
    assert far.tolerance_m == 1000

    blurry = verify_gps(visit, _payload(lng, lat, accuracy=250), GpsKind.CLOSE)
    assert blurry.status == GpsStatus.PRECISION_BAJA

    site.location = None
    site.location_locked = False
    site.save(update_fields=["location", "location_locked"])
    visit.site.refresh_from_db()
    missing = verify_gps(visit, _payload(lng, lat, accuracy=15), GpsKind.CLOSE)
    assert missing.status == GpsStatus.SIN_REFERENCIA
    assert Site.objects.get(pk=site.pk).location is not None


def test_close_requires_concretado_line_for_order(api):
    _auth(api)
    visit = _visit("Finca La Esperanza")
    response = api.post(
        f"/api/v1/visits/{visit.id}/close",
        {"result": "PEDIDO_CONFIRMADO", "products": [], "gps": _payload(-75.432, 6.0306)},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["code"] == "visit.product"


def test_close_and_review_discrepancy(api):
    _auth(api)
    visit = _visit("Insumos del Oriente")
    product = Product.objects.get(sku="ANI-500")
    closed = api.post(
        f"/api/v1/visits/{visit.id}/close",
        {
            "result": "COTIZACION_SOLICITADA",
            "contact_name_free": "Marta",
            "notes": "Pidió cotización",
            "products": [
                {
                    "product_id": str(product.id),
                    "kind": "POTENCIAL",
                    "quantity": "2",
                    "horizon": "CORTO",
                }
            ],
            "gps": _payload(-74.08, 4.65, accuracy=20),
        },
        format="json",
    )
    assert closed.status_code == 200
    assert closed.data["gps_check"]["status"] == "FUERA_DE_RANGO"
    assert closed.data["products"][0]["total_value"] == "104000.00"

    api.credentials()
    _auth(api, "gerencia@naturalcontrol.test")
    listing = api.get("/api/v1/gps-checks")
    assert listing.status_code == 200
    row = next(item for item in listing.data["results"] if item["client_name"] == "Insumos del Oriente")
    reviewed = api.post(
        f"/api/v1/gps-checks/{row['id']}/review",
        {"review_status": "JUSTIFICADA", "note": "Estaba en la vía de acceso."},
        format="json",
    )
    assert reviewed.status_code == 200
    assert reviewed.data["review_status"] == "JUSTIFICADA"
