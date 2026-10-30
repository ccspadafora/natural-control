import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import OtpChannel, OtpPurpose, Role, User
from apps.accounts.services import revoke_all_devices
from apps.audit.services import record
from apps.core.exceptions import NcError
from apps.crm.models import Client
from apps.org.models import Zone
from apps.visits.models import Visit, VisitStatus


def _guard(user: User, code: str) -> None:
    if not user.has_perm_code(code):
        raise NcError("auth.forbidden", "No tienes permiso para esta acción.", status=403)


def list_users():
    return User.objects.filter(is_deleted=False).select_related("role", "zone").order_by("first_name", "email")


@transaction.atomic
def invite_user(actor: User, data: dict) -> User:
    _guard(actor, "users.manage")
    email = (data.get("email") or "").strip().lower()
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    if "@" not in email or len(first_name) < 2:
        raise NcError("user.invalid", "Escribe el nombre y un correo válido.", status=400)
    if User.objects.filter(email=email).exists():
        raise NcError("user.duplicate", "Ya hay un usuario con ese correo.", status=409)
    role = Role.objects.filter(code=data.get("role"), is_deleted=False).first()
    if role is None:
        raise NcError("user.invalid", "Elige un rol.", status=400)
    zone = None
    if data.get("zone_id"):
        zone = Zone.objects.filter(id=data["zone_id"], is_deleted=False).first()
    if role.code in {"RTC", "LIDER_ZONA"} and zone is None:
        raise NcError("user.zone_required", "Un comercial o un líder necesita zona.", status=400)
    user = User.objects.create_user(
        email=email,
        password=None,
        role=role,
        first_name=first_name,
        last_name=last_name,
        zone=zone,
        phone=(data.get("phone") or "").strip(),
    )
    _send_invite(user)
    record(actor, "user.invite", user, after={"email": email, "role": role.code})
    return user


def _send_invite(user: User) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    from apps.accounts.models import OtpChallenge

    OtpChallenge.objects.create(
        user=user,
        channel=OtpChannel.EMAIL,
        purpose=OtpPurpose.PASSWORD_RESET,
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(hours=72),
    )
    send_mail(
        "Activa tu acceso a Natural Control",
        (
            f"Hola {user.first_name}. Tu usuario es {user.email}. "
            f"Entra a la Consola, abre Recuperar contraseña y crea la tuya con este código: {code}. "
            "Vence en 72 horas."
        ),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )


@transaction.atomic
def update_user(actor: User, user_id, data: dict) -> User:
    _guard(actor, "users.manage")
    user = User.objects.filter(id=user_id, is_deleted=False).select_related("role").first()
    if user is None:
        raise NcError("resource.not_found", "No encontramos ese usuario.", status=404)
    if "first_name" in data:
        user.first_name = (data.get("first_name") or "").strip()
    if "last_name" in data:
        user.last_name = (data.get("last_name") or "").strip()
    if "phone" in data:
        user.phone = (data.get("phone") or "").strip()
    if data.get("role"):
        role = Role.objects.filter(code=data["role"], is_deleted=False).first()
        if role is None:
            raise NcError("user.invalid", "Elige un rol.", status=400)
        user.role = role
    if "zone_id" in data:
        user.zone = Zone.objects.filter(id=data["zone_id"], is_deleted=False).first() if data["zone_id"] else None
    if user.role.code in {"RTC", "LIDER_ZONA"} and user.zone_id is None:
        raise NcError("user.zone_required", "Un comercial o un líder necesita zona.", status=400)
    user.updated_by = actor
    user.save()
    record(actor, "user.update", user)
    return user


@transaction.atomic
def set_active(actor: User, user_id, active: bool) -> User:
    _guard(actor, "users.manage")
    user = User.objects.filter(id=user_id, is_deleted=False).first()
    if user is None:
        raise NcError("resource.not_found", "No encontramos ese usuario.", status=404)
    if user.id == actor.id and not active:
        raise NcError("user.invalid", "No puedes desactivar tu propio usuario.", status=400)
    if not active and Client.objects.filter(owner=user, is_deleted=False).exists():
        raise NcError("user.has_clients", "Reasigna la cartera antes de desactivar a esta persona.", status=409)
    user.is_active = active
    user.updated_by = actor
    user.save(update_fields=["is_active", "updated_by", "updated_at"])
    if not active:
        revoke_all_devices(user, by=actor)
    record(actor, "user.deactivate" if not active else "user.reactivate", user)
    return user


@transaction.atomic
def reassign_clients(actor: User, client_ids: list, owner_id) -> int:
    _guard(actor, "clients.reassign")
    owner = User.objects.filter(id=owner_id, is_deleted=False, is_active=True).first()
    if owner is None or owner.role.code != "RTC":
        raise NcError("client.owner", "Elige un comercial activo.", status=400)
    if owner.zone_id is None:
        raise NcError("client.owner", "Ese comercial no tiene zona.", status=400)
    clients = list(Client.objects.filter(id__in=client_ids, is_deleted=False))
    if not clients:
        raise NcError("client.owner", "Elige al menos un cliente.", status=400)
    for client in clients:
        client.owner = owner
        client.zone_id = owner.zone_id
        client.updated_by = actor
        client.save(update_fields=["owner", "zone", "updated_by", "updated_at"])
        Visit.objects.filter(
            client=client,
            is_deleted=False,
            status__in=[VisitStatus.PROGRAMADA, VisitStatus.EN_CURSO],
        ).update(rtc=owner, updated_by=actor, updated_at=timezone.now())
        record(actor, "client.reassign", client, after={"owner": str(owner.id)})
    return len(clients)


def list_zones():
    return Zone.objects.filter(is_deleted=False).prefetch_related("municipalities").order_by("name")


@transaction.atomic
def update_zone(actor: User, zone_id, data: dict) -> Zone:
    _guard(actor, "org.manage")
    zone = Zone.objects.filter(id=zone_id, is_deleted=False).first()
    if zone is None:
        raise NcError("resource.not_found", "No encontramos esa zona.", status=404)
    if "gps_tolerance_m" in data and data["gps_tolerance_m"] not in (None, ""):
        try:
            zone.gps_tolerance_m = int(data["gps_tolerance_m"])
        except (TypeError, ValueError) as exc:
            raise NcError("zone.invalid", "La tolerancia tiene que ser un número de metros.", status=400) from exc
        if zone.gps_tolerance_m < 50:
            raise NcError("zone.invalid", "La tolerancia mínima es 50 metros.", status=400)
    elif data.get("gps_tolerance_m") in (None, ""):
        zone.gps_tolerance_m = None
    if "municipality_ids" in data:
        from apps.geo.models import Municipality

        towns = Municipality.objects.filter(id__in=data["municipality_ids"], is_deleted=False)
        zone.municipalities.set(towns)
    zone.updated_by = actor
    zone.save()
    record(actor, "zone.update", zone)
    return zone
