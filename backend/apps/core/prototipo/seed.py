"""Siembra idempotente con los datos exactos del prototipo y fecha congelada."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point

from apps.accounts.models import Role
from apps.catalog.models import Category, Price, PriceList, Product, Unit
from apps.core.prototipo.data import (
    FROZEN_AT,
    MUNICIPALITIES,
    PROTO_CLIENTS,
    PROTO_PRODUCTS,
    PROTO_RTCS,
    PROTO_STAFF,
    PROTO_VISITS,
    PROTO_ZONES,
)
from apps.core.seed import DEV_PASSWORD, seed as base_seed
from apps.crm.models import (
    Client,
    ClientBiotech,
    ClientKind,
    ClientSource,
    ClientType,
    CommercialStatus,
    Contact,
    Crop,
    CropType,
    DocumentType,
    LocationSource,
    Site,
)
from apps.geo.models import Department, Municipality
from apps.goals.models import Goal, PeriodType
from apps.org.models import Zone
from apps.parameters.models import SystemSetting, ValueType
from apps.visits.models import (
    GpsCheck,
    GpsError,
    GpsKind,
    GpsStatus,
    ReviewStatus,
    Visit,
    VisitOrigin,
    VisitReason,
    VisitResult,
    VisitStatus,
)

# Coordenadas aproximadas por municipio (lng, lat) para demos GPS
MUN_COORDS = {
    "Rionegro": (-75.374, 6.153),
    "Marinilla": (-75.339, 6.174),
    "El Retiro": (-75.503, 6.058),
    "El Carmen de Viboral": (-75.335, 6.083),
    "La Ceja": (-75.432, 6.031),
    "Sonsón": (-75.311, 5.710),
    "Guarne": (-75.443, 6.280),
    "El Peñol": (-75.243, 6.219),
    "Chinchiná": (-75.606, 4.983),
    "Montenegro": (-75.751, 4.567),
    "Candelaria": (-76.348, 3.407),
    "Facatativá": (-74.355, 4.815),
    "San Vicente de Chucurí": (-73.412, 6.881),
    "Calarcá": (-75.645, 4.529),
    "Santa Rosa de Cabal": (-75.605, 4.867),
}

STATUS_MAP = {
    "ACTIVO": CommercialStatus.ACTIVO,
    "PROSPECTO": CommercialStatus.PROSPECTO,
    "INACTIVO": CommercialStatus.INACTIVO,
}

RESULT_MAP = {
    "PEDIDO_CONFIRMADO": VisitResult.PEDIDO_CONFIRMADO,
    "COTIZACION_SOLICITADA": VisitResult.COTIZACION_SOLICITADA,
    "SEGUIMIENTO_PROGRAMADO": VisitResult.SEGUIMIENTO_PROGRAMADO,
    "SIN_INTERES": VisitResult.SIN_INTERES,
}


def _split_name(full: str) -> tuple[str, str]:
    parts = full.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _ensure_geo() -> dict[str, Municipality]:
    by_name: dict[str, Municipality] = {}
    for code, name, dept_code, dept_name in MUNICIPALITIES:
        dept, _ = Department.objects.get_or_create(code=dept_code, defaults={"name": dept_name})
        mun, _ = Municipality.objects.get_or_create(code=code, defaults={"name": name, "department": dept})
        by_name[name] = mun
    return by_name


def _ensure_zones() -> dict[str, Zone]:
    zones: dict[str, Zone] = {}
    for row in PROTO_ZONES:
        zone, _ = Zone.objects.update_or_create(
            code=row["code"],
            defaults={"name": row["name"], "gps_tolerance_m": row["tol"]},
        )
        PriceList.objects.get_or_create(
            zone=zone,
            is_default=True,
            defaults={"name": f"Público {row['name']} 2025", "valid_from": date(2025, 1, 1)},
        )
        zones[row["id"]] = zone
    return zones


def _ensure_users(zones: dict[str, Zone]) -> dict[str, object]:
    User = get_user_model()
    roles = {r.code: r for r in Role.objects.all()}
    users: dict[str, object] = {}

    for row in PROTO_RTCS:
        first, last = _split_name(row["name"])
        zone = zones[row["z"]]
        user = User.objects.filter(email=row["email"]).first()
        if user is None:
            user = User.objects.create_user(
                email=row["email"],
                password=DEV_PASSWORD,
                role=roles["RTC"],
                first_name=first,
                last_name=last,
                zone=zone,
                erp_seller_code=row["erp"],
            )
        else:
            user.first_name = first
            user.last_name = last
            user.role = roles["RTC"]
            user.zone = zone
            user.erp_seller_code = row["erp"]
            user.set_password(DEV_PASSWORD)
            user.save()
        users[row["id"]] = user

    for row in PROTO_STAFF:
        first, last = _split_name(row["name"])
        user = User.objects.filter(email=row["email"]).first()
        if user is None:
            user = User.objects.create_user(
                email=row["email"],
                password=DEV_PASSWORD,
                role=roles[row["role"]],
                first_name=first,
                last_name=last,
                zone=zones[row["zones"][0]] if row["zones"] else None,
            )
        else:
            user.first_name = first
            user.last_name = last
            user.role = roles[row["role"]]
            user.set_password(DEV_PASSWORD)
            user.save()
        for zid in row["zones"]:
            zones[zid].leaders.add(user)
        users[row["email"]] = user

    return users


def _ensure_catalog(zones: dict[str, Zone]) -> dict[str, Product]:
    products: dict[str, Product] = {}
    for row in PROTO_PRODUCTS:
        cat, _ = Category.objects.get_or_create(name=row["cat"], defaults={"sort_order": 1})
        unit = Unit.KG if row["unit"] == "KG" else Unit.L
        product, _ = Product.objects.update_or_create(
            sku=row["sku"],
            defaults={
                "name": row["name"],
                "category": cat,
                "presentation": "1 " + row["unit"].lower(),
                "active_ingredient": row["ai"],
                "unit": unit,
                "unit_size": Decimal("1.000"),
                "is_active": True,
                "is_available": True,
            },
        )
        for zone in zones.values():
            price_list = PriceList.objects.filter(zone=zone, is_default=True, is_deleted=False).first()
            if price_list is None:
                continue
            Price.objects.get_or_create(
                price_list=price_list,
                product=product,
                defaults={"unit_price": Decimal(str(row["price"])), "currency": "COP"},
            )
        products[row["name"]] = product
    return products


def _ensure_clients(
    users: dict[str, object],
    zones: dict[str, Zone],
    mun_by_name: dict[str, Municipality],
    products: dict[str, Product],
) -> dict[str, Client]:
    clients: dict[str, Client] = {}
    type_cache: dict[str, ClientType] = {}
    for row in PROTO_CLIENTS:
        ctype = type_cache.get(row["tipo"])
        if ctype is None:
            ctype, _ = ClientType.objects.get_or_create(name=row["tipo"], defaults={"is_active": True})
            type_cache[row["tipo"]] = ctype
        rtc = users[row["rtc"]]
        zone = rtc.zone
        price_list = PriceList.objects.filter(zone=zone, is_default=True, is_deleted=False).first()
        doc_type, doc_number = row["doc"]
        kind = ClientKind.EMPRESA if doc_type == "NIT" else ClientKind.PERSONA
        client, created = Client.objects.get_or_create(
            document_type=doc_type if doc_type in DocumentType.values else DocumentType.NIT,
            document_number=doc_number,
            defaults={
                "kind": kind,
                "legal_name": row["name"],
                "trade_name": row["name"],
                "client_type": ctype,
                "segment": row["seg"],
                "commercial_status": STATUS_MAP[row["estado"]],
                "owner": rtc,
                "zone": zone,
                "price_list": price_list,
                "phone": row["phone"],
                "source": ClientSource.APP,
                "data_consent_at": FROZEN_AT - timedelta(days=40),
            },
        )
        if not created:
            client.legal_name = row["name"]
            client.trade_name = row["name"]
            client.owner = rtc
            client.zone = zone
            client.segment = row["seg"]
            client.commercial_status = STATUS_MAP[row["estado"]]
            client.phone = row["phone"]
            client.save()
        Contact.objects.get_or_create(
            client=client,
            phone=row["phone"],
            defaults={
                "full_name": row["owner"],
                "is_primary": True,
                "whatsapp_opt_in_at": FROZEN_AT - timedelta(days=30) if row.get("nuevo") else FROZEN_AT - timedelta(days=90),
            },
        )
        mun = mun_by_name.get(row["mun"]) or next(iter(mun_by_name.values()))
        lng, lat = MUN_COORDS.get(row["mun"], (-75.37, 6.15))
        site, _ = Site.objects.get_or_create(
            client=client,
            is_primary=True,
            defaults={
                "name": "Sede principal",
                "municipality": mun,
                "location": Point(lng, lat, srid=4326),
                "location_source": LocationSource.GPS_DEVICE,
                "location_accuracy_m": 12,
                "location_set_at": FROZEN_AT - timedelta(days=60),
                "location_locked": True,
                "total_area_ha": Decimal(str(row["ha"])) if row["ha"] else None,
            },
        )
        for crop_name, ha in row["crops"]:
            crop_type, _ = CropType.objects.get_or_create(name=crop_name)
            Crop.objects.get_or_create(
                site=site,
                crop_type=crop_type,
                defaults={"area_ha": Decimal(str(ha)), "recorded_at": FROZEN_AT.date()},
            )
        for bio_name, propio in row["bio"]:
            product = products.get(bio_name) if propio else None
            ClientBiotech.objects.get_or_create(
                client=client,
                product=product,
                competitor_product="" if propio else bio_name,
                defaults={"site": site, "competitor_brand": "" if propio else "Competencia"},
            )
        clients[row["id"]] = client
    return clients


def _parse_time(t: str) -> time:
    hour, minute = map(int, t.split(":"))
    return time(hour, minute)


def _ensure_visits(users: dict[str, object], clients: dict[str, Client]) -> dict[str, Visit]:
    visits: dict[str, Visit] = {}
    reason_cache: dict[str, VisitReason] = {}
    day = FROZEN_AT.date()

    for row in PROTO_VISITS:
        reason_name = row["reason"]
        if reason_name not in reason_cache:
            reason, _ = VisitReason.objects.get_or_create(name=reason_name, defaults={"is_active": True})
            reason_cache[reason_name] = reason
        reason = reason_cache[reason_name]
        rtc = users[row["rtc"]]
        client = clients[row["client"]]
        site = client.sites.filter(is_primary=True).first() or client.sites.first()
        start = datetime.combine(day, _parse_time(row["t"]), tzinfo=FROZEN_AT.tzinfo)
        origin = VisitOrigin.ASIGNADA if row.get("origin") == "LIDER" else VisitOrigin.RTC
        status = row["st"]
        visit, created = Visit.objects.get_or_create(
            rtc=rtc,
            client=client,
            scheduled_start=start,
            defaults={
                "site": site,
                "reason": reason,
                "origin": origin,
                "status": status,
                "scheduled_end": start + timedelta(minutes=60),
                "contact_name_free": (
                    client.contacts.first().full_name if client.contacts.exists() else ""
                ),
            },
        )
        if not created:
            visit.status = status
            visit.site = site
            visit.reason = reason
            visit.save()

        if status == VisitStatus.REALIZADA:
            visit.started_at = start
            visit.completed_at = start + timedelta(minutes=45)
            visit.result = RESULT_MAP.get(row["res"]) if row.get("res") else None
            visit.notes = "Visita de demostración del prototipo."
            visit.save()
        elif status == VisitStatus.NO_REALIZADA:
            visit.not_done_reason = row.get("not_done") or "Cliente ausente"
            visit.completed_at = start
            visit.save()

        if row.get("gps") and status in (VisitStatus.REALIZADA, VisitStatus.NO_REALIZADA):
            ref = site.location
            dist = row.get("dist")
            acc = row.get("acc") or 15
            pos = None
            if ref is not None and dist is not None:
                delta = float(dist) * 1e-5 / 1.1
                pos = Point(ref.x + delta, ref.y, srid=4326)
            review = (
                ReviewStatus.PENDIENTE
                if row["gps"]
                in (GpsStatus.FUERA_DE_RANGO, GpsStatus.SIN_UBICACION, GpsStatus.PRECISION_BAJA)
                else ReviewStatus.NO_REQUERIDA
            )
            error = GpsError.PERMISSION_DENIED if row["gps"] == GpsStatus.SIN_UBICACION else GpsError.NONE
            GpsCheck.objects.get_or_create(
                visit=visit,
                kind=GpsKind.CLOSE,
                defaults={
                    "position": pos,
                    "accuracy_m": None if row["gps"] == GpsStatus.SIN_UBICACION else float(acc),
                    "captured_at": visit.completed_at or start,
                    "received_at": visit.completed_at or start,
                    "error": error,
                    "reference_location": ref,
                    "tolerance_m": 1000,
                    "distance_m": float(dist) if dist is not None else None,
                    "status": row["gps"],
                    "review_status": review,
                    "rtc_justification": row.get("just") or "",
                },
            )
        visits[row["id"]] = visit
    return visits


def _ensure_goals(users: dict[str, object]) -> None:
    period_start = date(2026, 10, 1)
    for row in PROTO_RTCS:
        user = users[row["id"]]
        Goal.objects.update_or_create(
            user=user,
            period_type=PeriodType.MES,
            period_start=period_start,
            defaults={
                "sales_budget": Decimal(str(int(row["budget"]))),
                "visits_target": row["vt"],
                "new_clients_target": 4,
            },
        )


def seed_prototipo() -> None:
    """Carga roles base + datos del prototipo. Idempotente."""
    base_seed()
    SystemSetting.objects.update_or_create(
        key="demo.frozen_at",
        defaults={
            "value": FROZEN_AT.isoformat(),
            "value_type": ValueType.STRING,
            "module": "demo",
            "description": "Fecha congelada del seed prototipo (America/Bogota)",
            "editable_by_role": ["ADMIN"],
        },
    )
    SystemSetting.objects.update_or_create(
        key="feature.demo_mode",
        defaults={
            "value": True,
            "value_type": ValueType.BOOL,
            "module": "feature",
            "description": "Modo demo (dev/staging): selectores de rol y simuladores",
            "editable_by_role": ["ADMIN"],
        },
    )

    mun_by_name = _ensure_geo()
    zones = _ensure_zones()
    users = _ensure_users(zones)
    products = _ensure_catalog(zones)
    clients = _ensure_clients(users, zones, mun_by_name, products)
    _ensure_visits(users, clients)
    _ensure_goals(users)
