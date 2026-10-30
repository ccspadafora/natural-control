from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Category, PriceList, Product
from apps.catalog.services import resolve_unit_price
from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import Client
from apps.parameters.services import get_setting

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


def test_admin_adds_a_product_and_prices_it_on_the_zone_list(api):
    _auth(api)
    category = Category.objects.get(name="Bioinsumos")
    created = api.post(
        "/api/v1/catalog/products",
        {
            "sku": "BEA-250",
            "name": "Beauveria",
            "presentation": "250 g",
            "category_id": str(category.id),
            "unit": "KG",
            "unit_size": "0.250",
        },
        format="json",
    )
    assert created.status_code == 201
    price_list = PriceList.objects.get(zone__code="ORIENTE", is_default=True)
    saved = api.put(
        f"/api/v1/catalog/price-lists/{price_list.id}/prices",
        {"prices": [{"product_id": created.data["id"], "unit_price": "45000"}]},
        format="json",
    )
    assert saved.status_code == 200
    client = Client.objects.get(legal_name="Finca La Esperanza")
    product = Product.objects.get(sku="BEA-250")
    assert resolve_unit_price(client, product) == Decimal("45000.00")


def test_salesperson_cannot_change_the_catalog(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.post("/api/v1/catalog/products", {}, format="json")
    assert response.status_code == 403


def test_admin_updates_a_setting_and_rejects_a_bad_value(api):
    _auth(api)
    updated = api.patch("/api/v1/settings/gps.tolerance_m", {"value": 800}, format="json")
    assert updated.status_code == 200
    assert get_setting("gps.tolerance_m") == 800
    rejected = api.patch("/api/v1/settings/gps.tolerance_m", {"value": "no"}, format="json")
    assert rejected.status_code == 400


def test_salesperson_cannot_edit_settings(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.patch("/api/v1/settings/gps.tolerance_m", {"value": 800}, format="json")
    assert response.status_code == 403
