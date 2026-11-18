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


def _auth(api, email="rtc@naturalcontrol.test"):
    response = api.post(
        "/api/v1/auth/login",
        {"identifier": email, "password": DEV_PASSWORD},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )
    assert response.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")


def test_agenda_range_returns_week_visits(api):
    _auth(api)
    response = api.get("/api/v1/visits/agenda?from=2026-10-26&to=2026-10-31&view=range")
    assert response.status_code == 200
    assert "results" in response.data
    assert isinstance(response.data["results"], list)
    for row in response.data["results"]:
        assert "scheduled_start" in row
        assert "client_name" in row
        assert "late" in row


def test_agenda_single_day_still_works(api):
    _auth(api)
    response = api.get("/api/v1/visits/agenda?date=2026-10-29&view=today")
    assert response.status_code == 200
    assert isinstance(response.data["results"], list)
