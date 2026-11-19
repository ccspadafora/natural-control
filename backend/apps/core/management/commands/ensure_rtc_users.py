from __future__ import annotations

import re
import unicodedata
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Role
from apps.core.seed import DEV_PASSWORD
from apps.crm.client_import import fold, normalize_zone_label, read_rtc_roster
from apps.crm.models import Client
from apps.org.models import Zone


def _ascii_slug(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    parts = [part for part in re.split(r"[^a-zA-Z0-9]+", text.lower()) if part]
    return ".".join(parts)[:50] or "rtc"


def _title(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split())


def parse_person_name(raw: str) -> str:
    """Quita prefijos de zona/RTC del roster y deja el nombre de la persona."""
    text = " ".join(str(raw or "").split())
    if not text:
        return "Rtc"
    # "… RTC 1 - 2 - 3 ORLANDO PULIDO" / "… RTC 1 - NOMBRE" / "… RTC 1 NOMBRE"
    stripped = re.sub(
        r"^.*?\bRTC\s*(?:\d+\s*-\s*)*\d+\s*[-–]?\s*",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    if stripped and fold(stripped) != fold(text):
        return _title(stripped)
    if " - " in text:
        return _title(text.split(" - ")[-1].strip())
    text = re.sub(
        r"^(MERCADEO|DNV|CALDAS|VALLE|RISARALDA|QUINDIO|SANTANDER|ANTIOQUIA|CUNDINAMARCA|URABA|TOLIMA)\s+",
        "",
        text,
        flags=re.IGNORECASE,
    )
    return _title(text.strip()) or "Rtc"


def split_name(full: str) -> tuple[str, str]:
    parts = [p for p in full.split() if p]
    if not parts:
        return "Rtc", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


SKIP_OWNERS = {
    "SIN COMERCIAL",
    "NATURAL CONTROL",
    "NATURAL CONTROL SA",
}


class Command(BaseCommand):
    help = "Crea/activa usuarios RTC del roster y de ventas, con contraseña de piloto."

    def add_arguments(self, parser):
        parser.add_argument(
            "--nc-dir",
            default="/app/NC",
            help="Carpeta con BASE DE DATOS*.xlsx",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        role = Role.objects.get(code="RTC")
        folder = Path(options["nc_dir"])
        roster_wb = next(folder.glob("BASE DE DATOS*.xlsx"), None)
        roster = read_rtc_roster(roster_wb) if roster_wb else []

        created = 0
        updated = 0
        activated = 0
        rows: list[dict] = []

        # 1) Usuarios canónicos del roster
        for item in roster:
            person = parse_person_name(item["name"])
            if fold(person) in SKIP_OWNERS or fold(item["name"]) in SKIP_OWNERS:
                continue
            first, last = split_name(person)
            zone_code = item.get("zone_code")
            zone = Zone.objects.filter(code=zone_code, is_deleted=False).first() if zone_code else None
            email = f"{_ascii_slug(person)}@naturalcontrol.test"

            user = User.objects.filter(email=email).first()
            if user is None:
                # Reusar cuenta creada con el label completo del roster si existe
                label_slug = _ascii_slug(item["name"])
                user = User.objects.filter(email=f"{label_slug}@naturalcontrol.test").first()

            if user is None:
                user = User.objects.create_user(
                    email=email,
                    password=DEV_PASSWORD,
                    role=role,
                    first_name=first[:80],
                    last_name=last[:80],
                    zone=zone,
                )
                created += 1
            else:
                user.email = email
                user.first_name = first[:80]
                user.last_name = last[:80]
                user.role = role
                if zone:
                    user.zone = zone
                user.is_active = True
                user.set_password(DEV_PASSWORD)
                user.save()
                updated += 1

            rows.append(
                {
                    "source": "roster",
                    "name": f"{user.first_name} {user.last_name}".strip(),
                    "email": user.email,
                    "zone": user.zone.code if user.zone_id else "",
                }
            )

            # Reasignar clientes desde cuentas duplicadas con el label del roster
            label_email = f"{_ascii_slug(item['name'])}@naturalcontrol.test"
            if label_email != email:
                dup = User.objects.filter(email=label_email).exclude(id=user.id).first()
                if dup:
                    Client.objects.filter(owner=dup, is_deleted=False).update(owner=user)
                    dup.is_active = False
                    dup.save(update_fields=["is_active", "updated_at"])

        # 2) Todos los RTC existentes (ventas/import): asegurar login
        for user in User.objects.filter(role=role).order_by("email"):
            full = fold(f"{user.first_name} {user.last_name}")
            if full in SKIP_OWNERS or fold(user.first_name) in SKIP_OWNERS:
                continue
            # Staging: todos los RTC identificados entran con la clave piloto
            user.set_password(DEV_PASSWORD)
            if not user.is_active:
                user.is_active = True
                activated += 1
            user.save(update_fields=["password", "is_active", "updated_at", "version"])
            if not any(r["email"] == user.email for r in rows):
                rows.append(
                    {
                        "source": "cartera",
                        "name": f"{user.first_name} {user.last_name}".strip(),
                        "email": user.email,
                        "zone": user.zone.code if user.zone_id else "",
                    }
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"RTC listos. Creados: {created}. Actualizados roster: {updated}. "
                f"Activados: {activated}. Con clave piloto: {len(rows)}. "
                f"Password: {DEV_PASSWORD}"
            )
        )
        for row in sorted(rows, key=lambda r: (r["zone"], r["email"])):
            self.stdout.write(f"{row['zone'] or '-':12} {row['email']:55} {row['name']}")
