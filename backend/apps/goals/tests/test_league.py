import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import DEV_PASSWORD, seed
from apps.goals.league import refresh_scorecards_for_period
from apps.goals.models import Badge
from apps.goals.tasks import refresh_scorecards

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


def test_league_board_gerencia(api):
    _auth(api, "gerencia@naturalcontrol.test")
    response = api.get("/api/v1/league")
    assert response.status_code == 200
    assert len(response.data["results"]) >= 10
    assert len(response.data["badges"]) >= 5
    assert len(response.data["ideal_pitch"]) == 6
    top = response.data["results"][0]
    assert top["gen"] == 92
    assert top["pos"] == 1


def test_league_board_zone_filter(api):
    _auth(api, "gerencia@naturalcontrol.test")
    response = api.get("/api/v1/league?zone=ori")
    assert response.status_code == 200
    assert {r["zone_code"] for r in response.data["results"]} == {"ori"}
    assert len(response.data["zones"]) >= 6


def test_league_board_lider_scoped(api):
    _auth(api, "lider@naturalcontrol.test")
    response = api.get("/api/v1/league")
    assert response.status_code == 200
    zones = {r["zone_code"] for r in response.data["results"]}
    assert zones <= {"ori", "eje"}


def test_scorecard_me_rtc(api):
    _auth(api, "rtc@naturalcontrol.test")
    response = api.get("/api/v1/league/scorecards/me")
    assert response.status_code == 200
    player = response.data["player"]
    assert player["gen"] == 88
    assert len(response.data["zone_avg"]) == 6
    assert any(n["is_me"] for n in response.data["neighborhood"])


def test_scorecard_other_forbidden_for_rtc(api):
    _auth(api, "rtc@naturalcontrol.test")
    board = api.get("/api/v1/league")
    other = next(r for r in board.data["results"] if r["email"] != "rtc@naturalcontrol.test")
    response = api.get(f"/api/v1/league/scorecards/{other['id']}")
    assert response.status_code == 403


def test_refresh_scorecards_task(api):
    result = refresh_scorecards_for_period()
    assert result["snapshots"] >= 10
    assert result["badges"] >= 4
    assert Badge.objects.filter(code="MVP").exists()
    task_result = refresh_scorecards()
    assert task_result["badges"] >= 4
