from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector
from django.db import models

from apps.core.models import BaseModel


class WaCategory(models.TextChoices):
    MARKETING = "MARKETING", "Marketing"
    UTILITY = "UTILITY", "Utilidad"
    AUTHENTICATION = "AUTHENTICATION", "Autenticación"


class WaTemplateStatus(models.TextChoices):
    PENDING = "PENDING", "Pendiente"
    APPROVED = "APPROVED", "Aprobada"
    REJECTED = "REJECTED", "Rechazada"
    PAUSED = "PAUSED", "Pausada"
    DISABLED = "DISABLED", "Desactivada"


class WaPurpose(models.TextChoices):
    FIRST_CONTACT = "FIRST_CONTACT", "Primer contacto"
    TECH_SHEET = "TECH_SHEET", "Ficha técnica"
    FOLLOW_UP = "FOLLOW_UP", "Seguimiento"
    OTP = "OTP", "Código"
    OTHER = "OTHER", "Otro"


class WaTemplate(BaseModel):
    name = models.CharField(max_length=512)
    language = models.CharField(max_length=10, default="es_CO")
    category = models.CharField(max_length=20, choices=WaCategory.choices)
    status = models.CharField(max_length=16, choices=WaTemplateStatus.choices, default=WaTemplateStatus.PENDING)
    components = models.JSONField(default=dict)
    variables_example = models.JSONField(default=dict, blank=True)
    purpose = models.CharField(max_length=20, choices=WaPurpose.choices, default=WaPurpose.OTHER)


class Conversation(BaseModel):
    client = models.ForeignKey("crm.Client", null=True, blank=True, on_delete=models.PROTECT, related_name="conversations")
    contact = models.ForeignKey("crm.Contact", null=True, blank=True, on_delete=models.PROTECT, related_name="conversations")
    wa_id = models.CharField(max_length=20, unique=True)
    assigned_to = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="conversations")
    last_inbound_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    unread_count = models.PositiveIntegerField(default=0)


class MessageDirection(models.TextChoices):
    IN = "IN", "Entrante"
    OUT = "OUT", "Saliente"


class MessageType(models.TextChoices):
    TEXT = "TEXT", "Texto"
    TEMPLATE = "TEMPLATE", "Plantilla"
    DOCUMENT = "DOCUMENT", "Documento"
    IMAGE = "IMAGE", "Imagen"
    AUDIO = "AUDIO", "Audio"
    VIDEO = "VIDEO", "Video"
    LOCATION = "LOCATION", "Ubicación"
    INTERACTIVE = "INTERACTIVE", "Interactivo"
    REACTION = "REACTION", "Reacción"
    UNSUPPORTED = "UNSUPPORTED", "No soportado"


class MessageStatus(models.TextChoices):
    QUEUED = "QUEUED", "En cola"
    SENT = "SENT", "Enviado"
    DELIVERED = "DELIVERED", "Entregado"
    READ = "READ", "Leído"
    FAILED = "FAILED", "Fallido"


class Message(BaseModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    direction = models.CharField(max_length=4, choices=MessageDirection.choices)
    wamid = models.CharField(max_length=128, unique=True, null=True, blank=True)
    type = models.CharField(max_length=16, choices=MessageType.choices)
    body = models.TextField(blank=True)
    template = models.ForeignKey(WaTemplate, null=True, blank=True, on_delete=models.SET_NULL)
    template_vars = models.JSONField(null=True, blank=True)
    media = models.ForeignKey("visits.Evidence", null=True, blank=True, on_delete=models.SET_NULL)
    tech_sheet = models.ForeignKey("catalog.TechSheet", null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=16, choices=MessageStatus.choices, default=MessageStatus.QUEUED)
    error_code = models.CharField(max_length=20, blank=True)
    error_detail = models.TextField(blank=True)
    sent_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    automation_run = models.ForeignKey("automation.AutomationRun", null=True, blank=True, on_delete=models.SET_NULL)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [GinIndex(SearchVector("body", config="spanish"), name="message_body_gin")]


class EmailStatus(models.TextChoices):
    QUEUED = "QUEUED", "En cola"
    SENT = "SENT", "Enviado"
    DELIVERED = "DELIVERED", "Entregado"
    BOUNCED = "BOUNCED", "Rebotado"
    COMPLAINED = "COMPLAINED", "Queja"
    FAILED = "FAILED", "Fallido"


class EmailLog(BaseModel):
    to = models.EmailField()
    subject = models.CharField(max_length=250)
    template_code = models.CharField(max_length=60, blank=True)
    ses_message_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    status = models.CharField(max_length=16, choices=EmailStatus.choices, default=EmailStatus.QUEUED)
    client = models.ForeignKey("crm.Client", null=True, blank=True, on_delete=models.SET_NULL)
    automation_run = models.ForeignKey("automation.AutomationRun", null=True, blank=True, on_delete=models.SET_NULL, related_name="emails")
    attachments = models.JSONField(default=list, blank=True)
