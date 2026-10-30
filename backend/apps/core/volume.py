"""Generador de volumen sintético para pruebas de rendimiento."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.crm.models import Client, ClientKind, ClientSource, ClientType, CommercialStatus, DocumentType, Site
from apps.geo.models import Municipality
from apps.org.models import Zone
from apps.visits.models import Visit, VisitOrigin, VisitReason, VisitStatus


def seed_volume(*, clients: int = 500, visits_per_client: int = 3) -> dict[str, int]:
    User = get_user_model()
    rtc = User.objects.filter(role__code="RTC", is_active=True).first()
    if rtc is None:
        raise RuntimeError("Necesitas al menos un RTC (corre seed o seed_prototipo primero).")
    zone = rtc.zone or Zone.objects.first()
    mun = Municipality.objects.first()
    if mun is None:
        raise RuntimeError("Necesitas municipios (seed_prototipo).")
    ctype, _ = ClientType.objects.get_or_create(name="Productor", defaults={"is_active": True})
    reason, _ = VisitReason.objects.get_or_create(name="Seguimiento", defaults={"is_active": True})

    created_clients = 0
    created_visits = 0
    now = timezone.now()

    for i in range(clients):
        doc = f"9{i:08d}"
        client, was_created = Client.objects.get_or_create(
            document_type=DocumentType.NIT,
            document_number=doc,
            defaults={
                "kind": ClientKind.EMPRESA,
                "legal_name": f"Cliente volumen {i:04d}",
                "client_type": ctype,
                "owner": rtc,
                "zone": zone,
                "commercial_status": CommercialStatus.ACTIVO,
                "source": ClientSource.IMPORT,
                "phone": f"310{i:07d}"[:20],
            },
        )
        if was_created:
            created_clients += 1
            site = Site.objects.create(
                client=client,
                name="Sede principal",
                is_primary=True,
                municipality=mun,
                location=Point(-75.37 + (i % 100) * 0.001, 6.15 + (i % 80) * 0.001, srid=4326),
                total_area_ha=Decimal("10.00"),
            )
        else:
            site = client.sites.filter(is_primary=True).first() or client.sites.first()

        for j in range(visits_per_client):
            start = now - timedelta(days=j + 1, hours=j)
            _, v_created = Visit.objects.get_or_create(
                rtc=rtc,
                client=client,
                scheduled_start=start,
                defaults={
                    "site": site,
                    "reason": reason,
                    "origin": VisitOrigin.RTC,
                    "status": VisitStatus.REALIZADA if j > 0 else VisitStatus.PROGRAMADA,
                    "scheduled_end": start + timedelta(minutes=45),
                    "completed_at": start + timedelta(minutes=40) if j > 0 else None,
                },
            )
            if v_created:
                created_visits += 1

    return {"clients": created_clients, "visits": created_visits}
