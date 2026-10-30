from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog.models import PriceList, Product
from apps.core.exceptions import NcError
from apps.crm.models import (
    BiotechStatus,
    Client,
    ClientBiotech,
    ClientKind,
    ClientSource,
    ClientType,
    Contact,
    Crop,
    CropPhase,
    CropType,
    DocumentType,
    LocationSource,
    OptInSource,
    Site,
)
from apps.geo.models import Municipality


def _require(user: User, code: str) -> None:
    if not user.has_perm_code(code):
        raise NcError("auth.forbidden", "No tienes permiso para esta acción.", status=403)


@transaction.atomic
def create_client(user: User, data: dict) -> Client:
    _require(user, "clients.create")
    if not data.get("data_consent"):
        raise NcError("client.consent_required", "Autoriza el tratamiento de datos para registrar el cliente.", status=400)
    if user.zone_id is None:
        raise NcError("client.zone_required", "Tu usuario no tiene zona. Pide ayuda a tu administrador.", status=400)
    legal_name = (data.get("legal_name") or "").strip()
    if len(legal_name) < 3:
        raise NcError("client.invalid", "Escribe la razón social o el nombre.", status=400)
    kind = data.get("kind")
    if kind not in ClientKind.values:
        raise NcError("client.invalid", "Elige si es persona o empresa.", status=400)
    try:
        client_type = ClientType.objects.get(id=data.get("client_type_id"), is_deleted=False, is_active=True)
        municipality = Municipality.objects.get(id=data.get("municipality_id"), is_deleted=False)
    except (ClientType.DoesNotExist, Municipality.DoesNotExist, ValueError, TypeError) as exc:
        raise NcError("client.invalid", "Elige el tipo de cliente y el municipio.", status=400) from exc
    try:
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
    except (TypeError, ValueError) as exc:
        raise NcError("client.location_required", "Fija la ubicación de la sede para guardar el cliente.", status=400) from exc
    if not (-5 <= latitude <= 16 and -82 <= longitude <= -66):
        raise NcError("client.location_required", "La ubicación queda fuera de Colombia. Vuelve a marcar el punto.", status=400)

    document_type = data.get("document_type") or (DocumentType.NIT if kind == ClientKind.EMPRESA else DocumentType.CC)
    document_number = (data.get("document_number") or "").strip() or None
    if document_number and Client.objects.filter(
        document_type=document_type, document_number=document_number, is_deleted=False
    ).exists():
        raise NcError("client.duplicate_document", "Ya hay un cliente con ese documento.", status=409)

    price_list = PriceList.objects.filter(zone_id=user.zone_id, is_default=True, is_deleted=False).first()
    now = timezone.now()
    client = Client.objects.create(
        kind=kind,
        document_type=document_type,
        document_number=document_number,
        legal_name=legal_name,
        trade_name=(data.get("trade_name") or "").strip(),
        client_type=client_type,
        owner=user,
        zone_id=user.zone_id,
        price_list=price_list,
        phone=(data.get("phone") or "").strip(),
        source=ClientSource.APP,
        data_consent_at=now,
        created_by=user,
        updated_by=user,
    )
    source = data.get("location_source") or LocationSource.GPS_DEVICE
    if source not in LocationSource.values:
        source = LocationSource.GPS_DEVICE
    site_name = (data.get("site_name") or "").strip() or "Sede principal"
    site = Site.objects.create(
        client=client,
        name=site_name,
        is_primary=True,
        municipality=municipality,
        location=Point(longitude, latitude, srid=4326),
        location_source=source,
        location_accuracy_m=data.get("accuracy_m") or None,
        location_set_by=user,
        location_set_at=now,
        location_locked=True,
        created_by=user,
        updated_by=user,
    )

    contact_name = (data.get("contact_name") or "").strip()
    if contact_name or client.phone:
        whatsapp = bool(data.get("whatsapp_opt_in"))
        Contact.objects.create(
            client=client,
            site=site,
            full_name=contact_name or legal_name,
            phone=client.phone,
            is_primary=True,
            whatsapp_opt_in=whatsapp,
            whatsapp_opt_in_at=now if whatsapp else None,
            whatsapp_opt_in_source=OptInSource.VERBAL_EN_VISITA if whatsapp else None,
            created_by=user,
            updated_by=user,
        )

    today = timezone.localdate()
    for raw in data.get("crops") or []:
        if not isinstance(raw, dict):
            continue
        crop_type = _resolve_crop_type(raw)
        if crop_type is None:
            continue
        try:
            area = float(raw.get("area_ha"))
        except (TypeError, ValueError):
            continue
        if area <= 0:
            continue
        phase = (raw.get("phase") or CropPhase.PRODUCCION).upper()
        if phase not in CropPhase.values:
            phase = CropPhase.PRODUCCION
        Crop.objects.create(
            site=site,
            crop_type=crop_type,
            area_ha=area,
            phase=phase,
            recorded_at=today,
            created_by=user,
            updated_by=user,
        )

    for raw in data.get("biotechs") or []:
        if not isinstance(raw, dict):
            continue
        product = None
        product_id = raw.get("product_id")
        if product_id:
            product = Product.objects.filter(id=product_id, is_deleted=False).first()
        competitor = (raw.get("competitor_product") or "").strip()
        if product is None and not competitor:
            continue
        ClientBiotech.objects.create(
            client=client,
            site=site,
            product=product,
            competitor_product="" if product else competitor,
            competitor_brand=(raw.get("competitor_brand") or "").strip() if not product else "",
            status=BiotechStatus.EN_USO,
            created_by=user,
            updated_by=user,
        )

    return client


def _resolve_crop_type(raw: dict) -> CropType | None:
    crop_type_id = raw.get("crop_type_id")
    if crop_type_id:
        return CropType.objects.filter(id=crop_type_id, is_deleted=False).first()
    name = (raw.get("name") or "").strip()
    if not name:
        return None
    crop_type, _ = CropType.objects.get_or_create(name=name)
    return crop_type
