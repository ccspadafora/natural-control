import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Device, OtpChannel, OtpPurpose, Platform, User
from apps.audit.services import record
from apps.core.exceptions import NcError
from apps.parameters.services import features, get_setting

GENERIC = "Usuario o contraseña incorrectos"
LOCK_MESSAGE = "La cuenta está bloqueada por 15 minutos. Te escribimos al correo."


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def assert_app_request(request) -> None:
    if request.headers.get("X-Requested-With") != "nc":
        raise NcError("auth.invalid_request", "Abre la aplicación para entrar.", status=400)


def _platform(user_agent: str) -> str:
    agent = user_agent.lower()
    if "android" in agent:
        return Platform.ANDROID
    if "iphone" in agent or "ipad" in agent:
        return Platform.IOS
    if "mozilla" in agent or "chrome" in agent:
        return Platform.DESKTOP
    return Platform.OTHER


def _rate_ip(request, bucket: str, limit: int, window: int) -> None:
    key = f"auth:ip:{bucket}:{_client_ip(request)}"
    count = cache.get(key, 0) + 1
    cache.set(key, count, window)
    if count > limit:
        raise NcError("request.throttled", "Espera un momento e inténtalo de nuevo.", status=429)


def _fail_key(user_id) -> str:
    return f"auth:fail:{user_id}"


def _lock_key(user_id) -> str:
    return f"auth:lock:{user_id}"


def _register_failure(user: User) -> None:
    key = _fail_key(user.id)
    fails = cache.get(key, 0) + 1
    cache.set(key, fails, 15 * 60)
    if fails >= 5:
        cache.set(_lock_key(user.id), True, 15 * 60)
        cache.delete(key)
        try:
            send_mail(
                "Tu acceso a Natural Control quedó en pausa",
                "Bloqueamos el ingreso durante 15 minutos después de varios intentos. Si no fuiste tú, cambia la contraseña al volver.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
        except Exception:
            pass
        raise NcError("auth.locked", LOCK_MESSAGE, status=401)


def _ensure_unlocked(user: User) -> None:
    if cache.get(_lock_key(user.id)):
        raise NcError("auth.locked", LOCK_MESSAGE, status=401)


def user_payload(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.code,
        "scope": user.effective_scope,
        "permissions": user.permission_codes(),
        "zone_id": str(user.zone_id) if user.zone_id else None,
        "requires_weekly_plan": user.requires_weekly_plan,
        "features": features(),
    }


def _issue(user: User, request, remember: bool = True) -> tuple[str, str, Device]:
    refresh = RefreshToken.for_user(user)
    refresh["remember"] = bool(remember)
    device = Device.objects.create(
        user=user,
        label=(request.META.get("HTTP_USER_AGENT") or "Navegador")[:120],
        platform=_platform(request.META.get("HTTP_USER_AGENT") or ""),
        is_standalone="standalone" in (request.GET.get("display") or ""),
        refresh_jti=str(refresh["jti"]),
        last_used_at=timezone.now(),
    )
    return str(refresh.access_token), str(refresh), device


def login(identifier: str, password: str, request, remember: bool = True) -> tuple[str, str, dict]:
    assert_app_request(request)
    _rate_ip(request, "login", 10, 60)
    identifier = identifier.strip()
    user = User.objects.filter(Q(email__iexact=identifier) | Q(username__iexact=identifier)).select_related("role").first()
    if user is None or not user.check_password(password):
        if user is not None and user.is_active:
            _ensure_unlocked(user)
            _register_failure(user)
        record(user, "auth.login_failed", user, request=request)
        raise NcError("auth.invalid_credentials", GENERIC, status=401)
    if not user.is_active:
        record(user, "auth.login_inactive", user, request=request)
        raise NcError("auth.inactive", "Esta cuenta está desactivada. Pide ayuda a tu administrador.", status=401)
    _ensure_unlocked(user)
    cache.delete(_fail_key(user.id))
    access, refresh, _device = _issue(user, request, remember=remember)
    user.last_seen_at = timezone.now()
    user.save(update_fields=["last_seen_at", "updated_at"])
    record(user, "auth.login", user, request=request)
    return access, refresh, user_payload(user)


def refresh_session(raw_token: str, request) -> tuple[str, str, bool]:
    assert_app_request(request)
    if not raw_token:
        raise NcError("auth.session_expired", "Vuelve a entrar.", status=401)
    if cache.get(f"auth:used:{_jti_hint(raw_token)}"):
        _revoke_from_reused_token(raw_token)
        raise NcError("auth.session_expired", "Cerramos la sesión en todos tus dispositivos. Vuelve a entrar.", status=401)
    try:
        token = RefreshToken(raw_token)
        user = User.objects.select_related("role").get(id=token["user_id"], is_active=True)
    except Exception as exc:
        raise NcError("auth.session_expired", "Vuelve a entrar.", status=401) from exc
    device = Device.objects.filter(user=user, refresh_jti=str(token["jti"]), revoked_at__isnull=True).first()
    if device is None:
        raise NcError("auth.session_expired", "Vuelve a entrar.", status=401)
    idle_days = int(get_setting("auth.session_idle_days"))
    if device.last_used_at and device.last_used_at < timezone.now() - timedelta(days=idle_days):
        device.revoked_at = timezone.now()
        device.save(update_fields=["revoked_at", "updated_at"])
        raise NcError("auth.session_expired", "La sesión venció por inactividad. Vuelve a entrar.", status=401)
    cache.set(f"auth:used:{token['jti']}", str(user.id), 90 * 24 * 3600)
    remember = bool(token.get("remember", True))
    new_refresh = RefreshToken.for_user(user)
    new_refresh["remember"] = remember
    device.refresh_jti = str(new_refresh["jti"])
    device.last_used_at = timezone.now()
    device.save(update_fields=["refresh_jti", "last_used_at", "updated_at"])
    return str(new_refresh.access_token), str(new_refresh), remember


def _jti_hint(raw_token: str) -> str:
    try:
        return str(RefreshToken(raw_token)["jti"])
    except Exception:
        return hashlib.sha256(raw_token.encode()).hexdigest()[:32]


def _revoke_from_reused_token(raw_token: str) -> None:
    try:
        token = RefreshToken(raw_token)
        user = User.objects.filter(id=token["user_id"]).first()
    except Exception:
        return
    if user:
        revoke_all_devices(user)
        try:
            send_mail(
                "Cerramos tus sesiones de Natural Control",
                "Detectamos un intento de reutilizar una sesión vencida y cerramos el acceso en todos los dispositivos.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
        except Exception:
            pass


def revoke_all_devices(user: User, by: User | None = None) -> None:
    Device.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=timezone.now(), revoked_by=by)


def logout(raw_token: str, request) -> None:
    assert_app_request(request)
    if not raw_token:
        return
    try:
        token = RefreshToken(raw_token)
        device = Device.objects.filter(refresh_jti=str(token["jti"]), revoked_at__isnull=True).first()
    except Exception:
        return
    if device:
        device.revoked_at = timezone.now()
        device.save(update_fields=["revoked_at", "updated_at"])
        record(device.user, "auth.logout", device.user, request=request)


def _send_code(user: User, purpose: str) -> None:
    window_key = f"auth:otp:{purpose}:{user.id}"
    sent = cache.get(window_key, 0)
    if sent >= 3:
        return
    code = f"{secrets.randbelow(1_000_000):06d}"
    from apps.accounts.models import OtpChallenge

    OtpChallenge.objects.create(
        user=user,
        channel=OtpChannel.EMAIL,
        purpose=purpose,
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    cache.set(window_key, sent + 1, 15 * 60)
    subject = "Código para entrar a Natural Control" if purpose == OtpPurpose.LOGIN else "Código para cambiar tu contraseña"
    send_mail(subject, f"Tu código es {code}. Vence en 10 minutos.", settings.DEFAULT_FROM_EMAIL, [user.email])


def request_code(identifier: str, purpose: str, request) -> None:
    assert_app_request(request)
    _rate_ip(request, "otp", 10, 60)
    user = User.objects.filter(Q(email__iexact=identifier.strip()) | Q(username__iexact=identifier.strip()), is_active=True).first()
    if user is not None:
        _send_code(user, purpose)


def _consume_code(identifier: str, code: str, purpose: str) -> User:
    from apps.accounts.models import OtpChallenge

    user = User.objects.filter(Q(email__iexact=identifier.strip()) | Q(username__iexact=identifier.strip()), is_active=True).select_related("role").first()
    if user is None:
        raise NcError("auth.invalid_code", "El código no es válido o ya venció.", status=401)
    challenge = (
        OtpChallenge.objects.filter(user=user, purpose=purpose, consumed_at__isnull=True, expires_at__gt=timezone.now())
        .order_by("-created_at")
        .first()
    )
    if challenge is None:
        raise NcError("auth.invalid_code", "El código no es válido o ya venció.", status=401)
    if challenge.attempts >= 5:
        raise NcError("auth.invalid_code", "El código no es válido o ya venció.", status=401)
    if not check_password(code, challenge.code_hash):
        challenge.attempts += 1
        challenge.save(update_fields=["attempts", "updated_at"])
        raise NcError("auth.invalid_code", "El código no es válido o ya venció.", status=401)
    challenge.consumed_at = timezone.now()
    challenge.save(update_fields=["consumed_at", "updated_at"])
    return user


def verify_otp_login(identifier: str, code: str, request) -> tuple[str, str, dict]:
    assert_app_request(request)
    if not get_setting("auth.otp_login_enabled"):
        raise NcError("auth.otp_disabled", "El ingreso con código no está disponible.", status=422)
    user = _consume_code(identifier, code, OtpPurpose.LOGIN)
    access, refresh, _device = _issue(user, request)
    record(user, "auth.login_otp", user, request=request)
    return access, refresh, user_payload(user)


def reset_password(identifier: str, code: str, new_password: str, request) -> None:
    assert_app_request(request)
    user = _consume_code(identifier, code, OtpPurpose.PASSWORD_RESET)
    try:
        validate_password(new_password, user)
    except ValidationError as exc:
        raise NcError("auth.weak_password", " ".join(exc.messages), status=400) from exc
    user.set_password(new_password)
    user.bump()
    user.save(update_fields=["password", "version", "updated_at"])
    revoke_all_devices(user)
    record(user, "auth.password_reset", user, request=request)


def set_refresh_cookie(response, token: str, remember: bool = True) -> None:
    options = {
        "httponly": True,
        "secure": settings.REFRESH_COOKIE_SECURE,
        "samesite": "Strict",
        "path": settings.REFRESH_COOKIE_PATH,
    }
    if remember:
        options["max_age"] = 90 * 24 * 3600
    response.set_cookie(settings.REFRESH_COOKIE_NAME, token, **options)


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=settings.REFRESH_COOKIE_PATH)
