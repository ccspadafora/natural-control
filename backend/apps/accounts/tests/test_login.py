import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.seed import DEV_PASSWORD, seed

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _cache():
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    seed()
    client = APIClient()
    client.credentials()
    return client


def _login(api, identifier=None, password=DEV_PASSWORD):
    return api.post(
        "/api/v1/auth/login",
        {"identifier": identifier or "rtc@naturalcontrol.test", "password": password},
        format="json",
        HTTP_X_REQUESTED_WITH="nc",
    )


def test_login_ok(api):
    response = _login(api)
    assert response.status_code == 200
    assert response.data["user"]["role"] == "RTC"
    assert "access" in response.data
    assert "nc_refresh" in response.cookies
    assert response.data["user"]["features"]["offline"] is True
    assert response.data["user"]["features"]["ai_reports"] is False


def test_login_invalid_is_generic(api):
    response = _login(api, password="no-es-la-clave")
    assert response.status_code == 401
    assert response.data["code"] == "auth.invalid_credentials"
    assert response.data["detail"] == "Usuario o contraseña incorrectos"


def test_inactive_user(api):
    user = User.objects.get(email="rtc@naturalcontrol.test")
    user.is_active = False
    user.save(update_fields=["is_active"])
    response = _login(api)
    assert response.status_code == 401
    assert response.data["code"] == "auth.inactive"


def test_lock_after_five_failures(api):
    for _ in range(4):
        response = _login(api, password="clave-incorrecta-1")
        assert response.data["code"] == "auth.invalid_credentials"
    response = _login(api, password="clave-incorrecta-1")
    assert response.status_code == 401
    assert response.data["code"] == "auth.locked"
    assert len(mail.outbox) == 1


def test_refresh_and_logout(api):
    login = _login(api)
    api.cookies["nc_refresh"] = login.cookies["nc_refresh"].value
    refreshed = api.post("/api/v1/auth/refresh", {}, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert refreshed.status_code == 200
    assert refreshed.data["access"]
    api.cookies["nc_refresh"] = refreshed.cookies["nc_refresh"].value
    me = api.get("/api/v1/auth/me", HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
    assert me.status_code == 200
    assert me.data["email"] == "rtc@naturalcontrol.test"
    logout = api.post("/api/v1/auth/logout", {}, format="json", HTTP_X_REQUESTED_WITH="nc")
    assert logout.status_code == 204
