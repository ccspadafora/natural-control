import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    seed()
    seed_prototipo()
    cache.clear()
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


def test_rtc_suggestions(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/visits/suggestions")
    assert response.status_code == 200
    assert "results" in response.data
    for row in response.data["results"]:
        assert row["client_id"]
        assert row["band"] in {"B1", "B2"}
        assert row["suggested_day"]


def test_leader_load(api):
    _auth(api, "lider@naturalcontrol.test")
    response = api.get("/api/v1/visits/load")
    assert response.status_code == 200
    assert isinstance(response.data["results"], list)
