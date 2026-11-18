import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.seed import DEV_PASSWORD, seed
from apps.core.prototipo.seed import seed_prototipo

pytestmark = pytest.mark.django_db


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


def test_my_numbers_returns_budget_and_sales(api):
    _auth(api)
    response = api.get("/api/v1/metrics/my-numbers")
    assert response.status_code == 200
    assert response.data["budget"] == 34_000_000
    assert response.data["sales"] == 31_200_000
    assert response.data["visits_target"] == 60
    assert response.data["visits_done"] >= 1
    assert response.data["falta"] == pytest.approx(2_800_000)
