"""Cartera de demostración para el RTC de Oriente. No reemplaza el importador del Excel."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.catalog.models import Category, Price, PriceList, Product, Unit
from apps.crm.models import Client, ClientKind, ClientSource, ClientType, CommercialStatus, DocumentType, LocationSource, Site
from apps.geo.models import Municipality
from apps.visits.models import Visit, VisitOrigin, VisitReason, VisitStatus


def seed_portfolio() -> None:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    rtc = User.objects.filter(email="rtc@naturalcontrol.test").first()
    if rtc is None or rtc.zone_id is None:
        return
    price_list = PriceList.objects.filter(zone_id=rtc.zone_id, is_default=True, is_deleted=False).first()
    farmer, _ = ClientType.objects.get_or_create(name="Agricultor", defaults={"is_active": True})
    store, _ = ClientType.objects.get_or_create(name="Almacén", defaults={"is_active": True})
    follow, _ = VisitReason.objects.get_or_create(name="Seguimiento comercial", defaults={"is_active": True})
    VisitReason.objects.get_or_create(name="Pedido", defaults={"is_active": True})

    category, _ = Category.objects.get_or_create(name="Bioinsumos", defaults={"sort_order": 1})
    products = [
        ("ANI-500", "Anisagro", "500 g", Unit.KG, Decimal("0.500"), Decimal("52000")),
        ("TRI-1L", "Trichoderma", "1 L", Unit.L, Decimal("1.000"), Decimal("48000")),
    ]
    for sku, name, presentation, unit, size, amount in products:
        product, _ = Product.objects.get_or_create(
            sku=sku,
            defaults={
                "name": name,
                "category": category,
                "presentation": presentation,
                "unit": unit,
                "unit_size": size,
                "is_active": True,
                "is_available": True,
            },
        )
        if price_list is not None:
            Price.objects.get_or_create(
                price_list=price_list,
                product=product,
                defaults={"unit_price": amount, "currency": "COP"},
            )

    la_ceja = Municipality.objects.get(code="05376")
    rionegro = Municipality.objects.get(code="05615")
    rows = [
        ("Finca La Esperanza", "PERSONA", "CC", "43920110", farmer, la_ceja, "3105550101", -75.432, 6.0306),
        ("Insumos del Oriente", "EMPRESA", "NIT", "900123456", store, rionegro, "6044440102", -75.374, 6.153),
        ("Vivero San José", "EMPRESA", "NIT", "900654321", store, la_ceja, "3105550199", -75.428, 6.028),
    ]
    clients = []
    for legal_name, kind, doc_type, number, client_type, municipality, phone, lng, lat in rows:
        client, _ = Client.objects.get_or_create(
            document_type=doc_type,
            document_number=number,
            defaults={
                "kind": kind if kind in ClientKind.values else ClientKind.EMPRESA,
                "legal_name": legal_name,
                "client_type": client_type,
                "owner": rtc,
                "zone_id": rtc.zone_id,
                "price_list": price_list,
                "phone": phone,
                "commercial_status": CommercialStatus.ACTIVO,
                "source": ClientSource.APP,
                "document_type": doc_type if doc_type in DocumentType.values else DocumentType.NIT,
            },
        )
        Site.objects.get_or_create(
            client=client,
            is_primary=True,
            defaults={
                "name": "Sede principal",
                "municipality": municipality,
                "location": Point(lng, lat, srid=4326),
                "location_source": LocationSource.IMPORT,
                "location_set_at": timezone.now(),
            },
        )
        clients.append(client)

    if not clients:
        return
    site = clients[0].sites.filter(is_primary=True).first()
    now = timezone.localtime()
    today_at = now.replace(hour=9, minute=30, second=0, microsecond=0)
    Visit.objects.get_or_create(
        client=clients[0],
        rtc=rtc,
        scheduled_start=today_at,
        defaults={
            "site": site,
            "origin": VisitOrigin.RTC,
            "reason": follow,
            "scheduled_end": today_at + timedelta(minutes=60),
            "status": VisitStatus.PROGRAMADA,
        },
    )
    overdue = today_at - timedelta(days=1)
    Visit.objects.get_or_create(
        client=clients[1],
        rtc=rtc,
        scheduled_start=overdue,
        defaults={
            "site": clients[1].sites.filter(is_primary=True).first(),
            "origin": VisitOrigin.RTC,
            "reason": follow,
            "scheduled_end": overdue + timedelta(minutes=60),
            "status": VisitStatus.PROGRAMADA,
        },
    )
    past = today_at - timedelta(days=12)
    Visit.objects.get_or_create(
        client=clients[2],
        rtc=rtc,
        scheduled_start=past,
        defaults={
            "site": clients[2].sites.filter(is_primary=True).first(),
            "origin": VisitOrigin.RTC,
            "reason": follow,
            "scheduled_end": past + timedelta(minutes=60),
            "status": VisitStatus.REALIZADA,
            "completed_at": past + timedelta(minutes=50),
            "result": "SEGUIMIENTO_PROGRAMADO",
        },
    )
