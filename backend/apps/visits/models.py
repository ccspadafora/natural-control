from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField

from apps.core.models import BaseModel


class VisitReason(BaseModel):
    name = models.CharField(max_length=80)
    is_active = models.BooleanField(default=True)


class VisitOrigin(models.TextChoices):
    RTC = "RTC", "RTC"
    ASIGNADA = "ASIGNADA", "Asignada"
    PROGRAMACION = "PROGRAMACION", "Programación"
    RECURRENTE = "RECURRENTE", "Recurrente"


class VisitPriority(models.TextChoices):
    BAJA = "BAJA", "Baja"
    MEDIA = "MEDIA", "Media"
    ALTA = "ALTA", "Alta"


class VisitStatus(models.TextChoices):
    PROGRAMADA = "PROGRAMADA", "Programada"
    EN_CURSO = "EN_CURSO", "En curso"
    REALIZADA = "REALIZADA", "Realizada"
    NO_REALIZADA = "NO_REALIZADA", "No realizada"
    CANCELADA = "CANCELADA", "Cancelada"


class VisitResult(models.TextChoices):
    PEDIDO_CONFIRMADO = "PEDIDO_CONFIRMADO", "Pedido confirmado"
    COTIZACION_SOLICITADA = "COTIZACION_SOLICITADA", "Cotización solicitada"
    SEGUIMIENTO_PROGRAMADO = "SEGUIMIENTO_PROGRAMADO", "Seguimiento programado"
    SIN_INTERES = "SIN_INTERES", "Sin interés"
    OTRO = "OTRO", "Otro"


class Visit(BaseModel):
    client = models.ForeignKey("crm.Client", on_delete=models.PROTECT, related_name="visits")
    site = models.ForeignKey("crm.Site", on_delete=models.PROTECT, related_name="visits")
    rtc = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="visits")
    assigned_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="assigned_visits"
    )
    origin = models.CharField(max_length=16, choices=VisitOrigin.choices, default=VisitOrigin.RTC)
    weekly_plan_item = models.ForeignKey(
        "visits.WeeklyPlanItem", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    recurrence = models.ForeignKey(
        "visits.VisitRecurrence", null=True, blank=True, on_delete=models.SET_NULL, related_name="visits"
    )
    reason = models.ForeignKey(VisitReason, null=True, blank=True, on_delete=models.PROTECT, related_name="visits")
    priority = models.CharField(max_length=8, choices=VisitPriority.choices, default=VisitPriority.MEDIA)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=VisitStatus.choices, default=VisitStatus.PROGRAMADA)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    server_received_at = models.DateTimeField(null=True, blank=True)
    contact = models.ForeignKey("crm.Contact", null=True, blank=True, on_delete=models.SET_NULL, related_name="visits")
    contact_name_free = models.CharField(max_length=160, blank=True)
    result = models.CharField(max_length=32, choices=VisitResult.choices, null=True, blank=True)
    notes = models.TextField(blank=True)
    agreements = models.TextField(blank=True)
    cancel_reason = models.CharField(max_length=250, blank=True)
    not_done_reason = models.CharField(max_length=250, blank=True)
    next_follow_up_at = models.DateTimeField(null=True, blank=True)
    client_signature = models.ForeignKey(
        "visits.Evidence", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    is_offline_created = models.BooleanField(default=False)
    device = models.ForeignKey("accounts.Device", null=True, blank=True, on_delete=models.SET_NULL, related_name="visits")
    edit_locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["rtc", "status", "scheduled_start"]),
            models.Index(fields=["client", "completed_at"]),
            models.Index(fields=["status", "completed_at"]),
        ]


class VisitRecurrence(BaseModel):
    client = models.ForeignKey("crm.Client", on_delete=models.CASCADE, related_name="recurrences")
    site = models.ForeignKey("crm.Site", on_delete=models.CASCADE, related_name="recurrences")
    rtc = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="recurrences")
    reason = models.ForeignKey(VisitReason, null=True, blank=True, on_delete=models.PROTECT)
    rrule = models.CharField(max_length=250)
    starts_on = models.DateField()
    ends_on = models.DateField(null=True, blank=True)
    default_start_time = models.TimeField()
    duration_min = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)


class ProductKind(models.TextChoices):
    CONCRETADO = "CONCRETADO", "Concretado"
    POTENCIAL = "POTENCIAL", "Potencial"


class Horizon(models.TextChoices):
    CORTO = "CORTO", "Corto"
    MEDIANO = "MEDIANO", "Mediano"
    LARGO = "LARGO", "Largo"


class PotentialStatus(models.TextChoices):
    ABIERTO = "ABIERTO", "Abierto"
    GANADO = "GANADO", "Ganado"
    PERDIDO = "PERDIDO", "Perdido"
    VENCIDO = "VENCIDO", "Vencido"
    REEMPLAZADO = "REEMPLAZADO", "Reemplazado"


class VisitProduct(BaseModel):
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="products")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="visit_lines")
    kind = models.CharField(max_length=16, choices=ProductKind.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit = models.CharField(max_length=10)
    unit_price = models.DecimalField(max_digits=16, decimal_places=2)
    total_value = models.DecimalField(max_digits=16, decimal_places=2)
    horizon = models.CharField(max_length=10, choices=Horizon.choices, null=True, blank=True)
    expected_date = models.DateField(null=True, blank=True)
    probability = models.PositiveSmallIntegerField(null=True, blank=True)
    crop_type = models.ForeignKey("crm.CropType", null=True, blank=True, on_delete=models.PROTECT)
    target_area_ha = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    opportunity_line = models.ForeignKey(
        "pipeline.OpportunityLine", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    status = models.CharField(max_length=16, choices=PotentialStatus.choices, default=PotentialStatus.ABIERTO)


class EvidenceKind(models.TextChoices):
    PHOTO = "PHOTO", "Foto"
    SIGNATURE = "SIGNATURE", "Firma"
    DOCUMENT = "DOCUMENT", "Documento"
    CONSENT = "CONSENT", "Consentimiento"


class UploadStatus(models.TextChoices):
    PENDING = "PENDING", "Pendiente"
    UPLOADED = "UPLOADED", "Subida"
    PROCESSED = "PROCESSED", "Procesada"
    FAILED = "FAILED", "Fallida"


class Evidence(BaseModel):
    kind = models.CharField(max_length=16, choices=EvidenceKind.choices)
    file = models.FileField(upload_to="evidence/", blank=True)
    content_type = models.CharField(max_length=80, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    sha256 = models.CharField(max_length=64, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    thumbnail = models.FileField(upload_to="evidence/thumbs/", blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    capture_location = models.PointField(geography=True, srid=4326, null=True, blank=True)
    visit = models.ForeignKey(Visit, null=True, blank=True, on_delete=models.CASCADE, related_name="evidence")
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="evidence")
    upload_status = models.CharField(max_length=16, choices=UploadStatus.choices, default=UploadStatus.PENDING)


class GpsKind(models.TextChoices):
    START = "START", "Inicio"
    CLOSE = "CLOSE", "Cierre"


class CaptureMode(models.TextChoices):
    ONLINE = "ONLINE", "En línea"
    OFFLINE = "OFFLINE", "Sin conexión"


class GpsError(models.TextChoices):
    NONE = "NONE", "Ninguno"
    PERMISSION_DENIED = "PERMISSION_DENIED", "Permiso negado"
    POSITION_UNAVAILABLE = "POSITION_UNAVAILABLE", "Sin posición"
    TIMEOUT = "TIMEOUT", "Tiempo agotado"
    UNSUPPORTED = "UNSUPPORTED", "No soportado"


class GpsStatus(models.TextChoices):
    VERIFICADA = "VERIFICADA", "Verificada"
    FUERA_DE_RANGO = "FUERA_DE_RANGO", "Discrepancia"
    SIN_REFERENCIA = "SIN_REFERENCIA", "Sin referencia"
    SIN_UBICACION = "SIN_UBICACION", "Sin ubicación"
    PRECISION_BAJA = "PRECISION_BAJA", "Precisión baja"


class ReviewStatus(models.TextChoices):
    NO_REQUERIDA = "NO_REQUERIDA", "No requerida"
    PENDIENTE = "PENDIENTE", "Pendiente"
    INFORMACION_SOLICITADA = "INFORMACION_SOLICITADA", "Información solicitada"
    JUSTIFICADA = "JUSTIFICADA", "Justificada"
    RECHAZADA = "RECHAZADA", "Rechazada"


class GpsFlag(models.TextChoices):
    CLOCK_SKEW = "CLOCK_SKEW", "Reloj desviado"
    STALE_FIX = "STALE_FIX", "Ubicación vieja"
    ACCURACY_TOO_PERFECT = "ACCURACY_TOO_PERFECT", "Precisión demasiado alta"
    SAME_POINT_REPEATED = "SAME_POINT_REPEATED", "Mismo punto repetido"
    IMPOSSIBLE_SPEED = "IMPOSSIBLE_SPEED", "Velocidad imposible"


class GpsCheck(BaseModel):
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="gps_checks")
    kind = models.CharField(max_length=8, choices=GpsKind.choices)
    position = models.PointField(geography=True, srid=4326, null=True, blank=True)
    accuracy_m = models.FloatField(null=True, blank=True)
    altitude_m = models.FloatField(null=True, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField()
    capture_mode = models.CharField(max_length=8, choices=CaptureMode.choices, default=CaptureMode.ONLINE)
    error = models.CharField(max_length=24, choices=GpsError.choices, default=GpsError.NONE)
    reference_location = models.PointField(geography=True, srid=4326, null=True, blank=True)
    tolerance_m = models.PositiveIntegerField()
    distance_m = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=GpsStatus.choices)
    flags = ArrayField(models.CharField(max_length=32, choices=GpsFlag.choices), default=list, blank=True)
    review_status = models.CharField(max_length=32, choices=ReviewStatus.choices, default=ReviewStatus.NO_REQUERIDA)
    rtc_justification = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)


class WeeklyPlanStatus(models.TextChoices):
    BORRADOR = "BORRADOR", "Borrador"
    ENVIADA = "ENVIADA", "Enviada"
    APROBADA = "APROBADA", "Aprobada"
    DEVUELTA = "DEVUELTA", "Devuelta"


class WeeklyPlan(BaseModel):
    rtc = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="weekly_plans")
    iso_year = models.PositiveSmallIntegerField()
    iso_week = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=16, choices=WeeklyPlanStatus.choices, default=WeeklyPlanStatus.BORRADOR)
    submitted_at = models.DateTimeField(null=True, blank=True)
    deadline_at = models.DateTimeField()
    is_late = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    review_note = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["rtc", "iso_year", "iso_week"], name="weekly_plan_unique_week")
        ]


class Slot(models.TextChoices):
    MANANA = "MANANA", "Mañana"
    TARDE = "TARDE", "Tarde"
    DIA = "DIA", "Día"


class WeeklyPlanItem(BaseModel):
    plan = models.ForeignKey(WeeklyPlan, on_delete=models.CASCADE, related_name="items")
    client = models.ForeignKey("crm.Client", on_delete=models.PROTECT, related_name="plan_items")
    site = models.ForeignKey("crm.Site", on_delete=models.PROTECT, related_name="plan_items")
    planned_date = models.DateField()
    slot = models.CharField(max_length=8, choices=Slot.choices, default=Slot.DIA)
    reason = models.ForeignKey(VisitReason, null=True, blank=True, on_delete=models.PROTECT)
    objective = models.CharField(max_length=250, blank=True)
    visit = models.OneToOneField(Visit, null=True, blank=True, on_delete=models.SET_NULL, related_name="plan_item")
