from django.contrib.gis.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector

from apps.core.models import BaseModel


class ClientKind(models.TextChoices):
    PERSONA = "PERSONA", "Persona"
    EMPRESA = "EMPRESA", "Empresa"


class DocumentType(models.TextChoices):
    NIT = "NIT", "NIT"
    CC = "CC", "Cédula"
    CE = "CE", "Cédula de extranjería"
    PASAPORTE = "PASAPORTE", "Pasaporte"
    OTRO = "OTRO", "Otro"


class Segment(models.TextChoices):
    A = "A", "A"
    B = "B", "B"
    C = "C", "C"


class CommercialStatus(models.TextChoices):
    PROSPECTO = "PROSPECTO", "Prospecto"
    ACTIVO = "ACTIVO", "Activo"
    INACTIVO = "INACTIVO", "Inactivo"
    PERDIDO = "PERDIDO", "Perdido"


class ClientSource(models.TextChoices):
    APP = "APP", "App"
    IMPORT = "IMPORT", "Importación"
    ERP = "ERP", "ERP"


class ClientType(BaseModel):
    name = models.CharField(max_length=80, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class Client(BaseModel):
    kind = models.CharField(max_length=16, choices=ClientKind.choices)
    document_type = models.CharField(max_length=16, choices=DocumentType.choices)
    document_number = models.CharField(max_length=20, null=True, blank=True)
    nit_dv = models.CharField(max_length=1, null=True, blank=True)
    legal_name = models.CharField(max_length=200)
    trade_name = models.CharField(max_length=200, blank=True)
    client_type = models.ForeignKey(ClientType, on_delete=models.PROTECT, related_name="clients")
    segment = models.CharField(max_length=1, choices=Segment.choices, null=True, blank=True)
    commercial_status = models.CharField(
        max_length=16, choices=CommercialStatus.choices, default=CommercialStatus.PROSPECTO
    )
    owner = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="clients")
    zone = models.ForeignKey("org.Zone", null=True, blank=True, on_delete=models.PROTECT, related_name="clients")
    price_list = models.ForeignKey(
        "catalog.PriceList",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="clients",
        help_text="Lista de precios que ve el RTC para este cliente. Se propone desde la zona y se puede cambiar.",
    )
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    erp_code = models.CharField(max_length=40, null=True, blank=True, unique=True)
    data_consent_at = models.DateTimeField(null=True, blank=True)
    data_consent_evidence = models.ForeignKey(
        "visits.Evidence", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    notes = models.TextField(blank=True)
    source = models.CharField(max_length=16, choices=ClientSource.choices, default=ClientSource.APP)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["document_type", "document_number"],
                condition=models.Q(document_number__isnull=False, is_deleted=False),
                name="client_unique_document",
            )
        ]
        indexes = [
            models.Index(fields=["owner", "commercial_status"]),
            models.Index(fields=["zone"]),
            GinIndex(SearchVector("legal_name", "trade_name", config="spanish"), name="client_search_gin"),
            GinIndex(fields=["legal_name"], name="client_legal_name_trgm", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self) -> str:
        return self.trade_name or self.legal_name


class LocationSource(models.TextChoices):
    GPS_DEVICE = "GPS_DEVICE", "GPS del dispositivo"
    MAP_PIN = "MAP_PIN", "Pin en el mapa"
    GEOCODED = "GEOCODED", "Geocodificada"
    IMPORT = "IMPORT", "Importación"


class Site(BaseModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="sites")
    name = models.CharField(max_length=120)
    is_primary = models.BooleanField(default=False)
    municipality = models.ForeignKey("geo.Municipality", on_delete=models.PROTECT, related_name="sites")
    vereda = models.CharField(max_length=120, blank=True)
    address = models.CharField(max_length=250, blank=True)
    location = models.PointField(geography=True, srid=4326, null=True, blank=True)
    location_source = models.CharField(max_length=16, choices=LocationSource.choices, blank=True)
    location_accuracy_m = models.FloatField(null=True, blank=True)
    location_set_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    location_set_at = models.DateTimeField(null=True, blank=True)
    location_locked = models.BooleanField(default=False)
    total_area_ha = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["client"],
                condition=models.Q(is_primary=True, is_deleted=False),
                name="site_one_primary",
            )
        ]
        indexes = [models.Index(fields=["client"])]


class LocationRequestStatus(models.TextChoices):
    PENDIENTE = "PENDIENTE", "Pendiente"
    APROBADA = "APROBADA", "Aprobada"
    RECHAZADA = "RECHAZADA", "Rechazada"


class LocationChangeRequest(BaseModel):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="location_requests")
    requested_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="location_requests")
    old_location = models.PointField(geography=True, srid=4326, null=True, blank=True)
    new_location = models.PointField(geography=True, srid=4326)
    new_accuracy_m = models.FloatField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=16, choices=LocationRequestStatus.choices, default=LocationRequestStatus.PENDIENTE)
    decided_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(blank=True)


class OptInSource(models.TextChoices):
    VERBAL_EN_VISITA = "VERBAL_EN_VISITA", "Verbal en visita"
    FORMULARIO = "FORMULARIO", "Formulario"
    MENSAJE_ENTRANTE = "MENSAJE_ENTRANTE", "Mensaje entrante"


class Contact(BaseModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="contacts")
    site = models.ForeignKey(Site, null=True, blank=True, on_delete=models.SET_NULL, related_name="contacts")
    full_name = models.CharField(max_length=160)
    role_title = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_primary = models.BooleanField(default=False)
    whatsapp_opt_in = models.BooleanField(default=False)
    whatsapp_opt_in_at = models.DateTimeField(null=True, blank=True)
    whatsapp_opt_in_source = models.CharField(max_length=24, choices=OptInSource.choices, null=True, blank=True)


class CropType(BaseModel):
    name = models.CharField(max_length=80, unique=True)

    def __str__(self) -> str:
        return self.name


class CropPhase(models.TextChoices):
    PRODUCCION = "PRODUCCION", "Producción"
    SIEMBRA = "SIEMBRA", "Siembra"


class Crop(BaseModel):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="crops")
    crop_type = models.ForeignKey(CropType, on_delete=models.PROTECT, related_name="crops")
    area_ha = models.DecimalField(max_digits=10, decimal_places=2)
    phase = models.CharField(max_length=16, choices=CropPhase.choices, default=CropPhase.PRODUCCION)
    notes = models.CharField(max_length=200, blank=True)
    recorded_at = models.DateField()


class BiotechStatus(models.TextChoices):
    EN_USO = "EN_USO", "En uso"
    DEJO_DE_USAR = "DEJO_DE_USAR", "Dejó de usar"


class ClientBiotech(BaseModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="biotechs")
    site = models.ForeignKey(Site, null=True, blank=True, on_delete=models.SET_NULL, related_name="biotechs")
    product = models.ForeignKey("catalog.Product", null=True, blank=True, on_delete=models.PROTECT, related_name="client_uses")
    competitor_product = models.CharField(max_length=160, blank=True)
    competitor_brand = models.CharField(max_length=120, blank=True)
    crop_type = models.ForeignKey(CropType, null=True, blank=True, on_delete=models.PROTECT, related_name="biotechs")
    status = models.CharField(max_length=16, choices=BiotechStatus.choices, default=BiotechStatus.EN_USO)
    since = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=250, blank=True)
    source_visit = models.ForeignKey("visits.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(product__isnull=False) | ~models.Q(competitor_product=""),
                name="biotech_product_or_competitor",
            )
        ]
