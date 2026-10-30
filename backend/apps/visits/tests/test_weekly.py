from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.seed import DEV_PASSWORD, seed
from apps.crm.models import Client
from apps.notifications.models import Notification
from apps.parameters.models import SystemSetting
from apps.visits.models import Visit, VisitOrigin, VisitStatus
from apps.visits.weekly import close_weekly_deadlines, remind_weekly_plans

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


def _require(api):
    _auth(api, "gerencia@naturalcontrol.test")
    ana = User.objects.get(email="rtc@naturalcontrol.test")
    response = api.put(
        f"/api/v1/users/{ana.id}/weekly-plan-requirement",
        {"required": True, "reason": "Cumplimiento bajo"},
        format="json",
    )
    assert response.status_code == 200
    ana.refresh_from_db()
    return ana


def test_salesperson_submits_the_week_and_the_visits_land_on_the_agenda(api):
    ana = _require(api)
    _auth(api, "rtc@naturalcontrol.test")
    opened = api.post("/api/v1/weekly-plans/current", {}, format="json")
    assert opened.status_code == 201
    assert opened.data["required"] is True
    plan_id = opened.data["plan"]["id"]
    client = Client.objects.get(legal_name="Finca La Esperanza")
    site = client.sites.filter(is_primary=True, is_deleted=False).first()
    created = api.post(
        f"/api/v1/weekly-plans/{plan_id}/items",
        {
            "client_id": str(client.id),
            "site_id": str(site.id),
            "planned_date": opened.data["week_start"],
            "slot": "MANANA",
            "objective": "Pedido de Anisagro",
        },
        format="json",
    )
    assert created.status_code == 201
    outside = parse_date(opened.data["week_end"]) + timedelta(days=1)
    rejected = api.post(
        f"/api/v1/weekly-plans/{plan_id}/items",
        {"client_id": str(client.id), "planned_date": outside.isoformat(), "slot": "DIA"},
        format="json",
    )
    assert rejected.status_code == 400

    submitted = api.post(f"/api/v1/weekly-plans/{plan_id}/submit", {}, format="json")
    assert submitted.status_code == 200
    assert submitted.data["status"] == "APROBADA"
    visit = Visit.objects.get(weekly_plan_item_id=created.data["id"])
    assert visit.origin == VisitOrigin.PROGRAMACION
    assert visit.status == VisitStatus.PROGRAMADA
    assert visit.rtc_id == ana.id
    assert Notification.objects.filter(kind="weekly_plan.submitted").exists()

    _auth(api, "gerencia@naturalcontrol.test")
    report = api.get("/api/v1/weekly-plans/compliance")
    assert report.status_code == 200
    row = next(item for item in report.data["results"] if item["rtc_id"] == str(ana.id))
    assert row["bucket"] in {"a_tiempo", "tarde"}
    assert row["planned"] == 1


def test_empty_plan_is_rejected_and_a_salesperson_cannot_require_it(api):
    _require(api)
    _auth(api, "rtc@naturalcontrol.test")
    opened = api.post("/api/v1/weekly-plans/current", {}, format="json")
    submitted = api.post(f"/api/v1/weekly-plans/{opened.data['plan']['id']}/submit", {}, format="json")
    assert submitted.status_code == 400
    ana = User.objects.get(email="rtc@naturalcontrol.test")
    forbidden = api.put(
        f"/api/v1/users/{ana.id}/weekly-plan-requirement",
        {"required": False, "reason": ""},
        format="json",
    )
    assert forbidden.status_code == 403


def test_review_returns_the_plan_until_it_is_approved(api):
    ana = _require(api)
    setting = SystemSetting.objects.get(key="weekly_plan.auto_approve")
    setting.value = False
    setting.save(update_fields=["value"])
    cache.delete("setting:weekly_plan.auto_approve")
    _auth(api, "rtc@naturalcontrol.test")
    opened = api.post("/api/v1/weekly-plans/current", {}, format="json")
    plan_id = opened.data["plan"]["id"]
    client = Client.objects.get(legal_name="Finca La Esperanza")
    api.post(
        f"/api/v1/weekly-plans/{plan_id}/items",
        {"client_id": str(client.id), "planned_date": opened.data["week_start"], "slot": "TARDE"},
        format="json",
    )
    submitted = api.post(f"/api/v1/weekly-plans/{plan_id}/submit", {}, format="json")
    assert submitted.status_code == 200
    assert submitted.data["status"] == "ENVIADA"
    assert Visit.objects.filter(rtc=ana, origin=VisitOrigin.PROGRAMACION).count() == 0

    _auth(api, "gerencia@naturalcontrol.test")
    returned = api.post(f"/api/v1/weekly-plans/{plan_id}/return", {"note": "Falta el jueves"}, format="json")
    assert returned.status_code == 200
    assert returned.data["status"] == "DEVUELTA"
    _auth(api, "rtc@naturalcontrol.test")
    again = api.post(f"/api/v1/weekly-plans/{plan_id}/submit", {}, format="json")
    assert again.status_code == 200
    _auth(api, "gerencia@naturalcontrol.test")
    approved = api.post(f"/api/v1/weekly-plans/{plan_id}/approve", {"note": ""}, format="json")
    assert approved.status_code == 200
    assert approved.data["status"] == "APROBADA"
    assert Visit.objects.filter(rtc=ana, origin=VisitOrigin.PROGRAMACION).count() == 1


def test_a_missed_deadline_is_notified_once(api, monkeypatch):
    ana = User.objects.get(email="rtc@naturalcontrol.test")
    ana.requires_weekly_plan = True
    ana.save(update_fields=["requires_weekly_plan"])
    monkeypatch.setattr("apps.visits.weekly.deadline_for", lambda *_args, **_kwargs: timezone.now() - timedelta(hours=1))
    assert close_weekly_deadlines() == 1
    assert Notification.objects.filter(user=ana, kind="weekly_plan.missed").exists()
    assert close_weekly_deadlines() == 0

    monkeypatch.setattr("apps.visits.weekly.deadline_for", lambda *_args, **_kwargs: timezone.now() + timedelta(hours=1))
    assert remind_weekly_plans() == 1
    assert Notification.objects.filter(user=ana, kind="weekly_plan.reminder_2h").exists()
