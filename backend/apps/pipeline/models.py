from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.core.models import BaseModel


class StageKind(models.TextChoices):
    OPEN = "OPEN", "Abierta"
    WON = "WON", "Ganada"
    LOST = "LOST", "Perdida"


class Stage(BaseModel):
    name = models.CharField(max_length=60)
    order = models.PositiveSmallIntegerField()
    probability = models.PositiveSmallIntegerField()
    kind = models.CharField(max_length=8, choices=StageKind.choices, default=StageKind.OPEN)
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default="#124481")


class LostReason(BaseModel):
    name = models.CharField(max_length=80)


class Opportunity(BaseModel):
    client = models.ForeignKey("crm.Client", on_delete=models.PROTECT, related_name="opportunities")
    site = models.ForeignKey("crm.Site", null=True, blank=True, on_delete=models.PROTECT, related_name="opportunities")
    owner = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="opportunities")
    stage = models.ForeignKey(Stage, on_delete=models.PROTECT, related_name="opportunities")
    title = models.CharField(max_length=160)
    amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    probability = models.PositiveSmallIntegerField()
    expected_close_date = models.DateField()
    priority_score = models.FloatField(null=True, blank=True)
    stage_changed_at = models.DateTimeField()
    last_activity_at = models.DateTimeField()
    lost_reason = models.ForeignKey(LostReason, null=True, blank=True, on_delete=models.PROTECT)
    won_at = models.DateTimeField(null=True, blank=True)
    lost_at = models.DateTimeField(null=True, blank=True)
    source_visit = models.ForeignKey("visits.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="opportunities")


class OpportunityLine(BaseModel):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="opportunity_lines")
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=16, decimal_places=2)
    total_value = models.DecimalField(max_digits=16, decimal_places=2)


class StageTrigger(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    AUTOMATION = "AUTOMATION", "Automatización"
    VISIT = "VISIT", "Visita"


class OpportunityStageHistory(BaseModel):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="stage_history")
    from_stage = models.ForeignKey(Stage, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    to_stage = models.ForeignKey(Stage, on_delete=models.PROTECT, related_name="+")
    changed_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="+")
    changed_at = models.DateTimeField()
    trigger = models.CharField(max_length=16, choices=StageTrigger.choices, default=StageTrigger.MANUAL)


class ChannelHint(models.TextChoices):
    VISITA = "VISITA", "Visita"
    LLAMADA = "LLAMADA", "Llamada"
    WHATSAPP = "WHATSAPP", "WhatsApp"
    CORREO = "CORREO", "Correo"


class FollowUpRule(BaseModel):
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name="follow_up_rules")
    days_after_entry = models.PositiveSmallIntegerField()
    task_title_template = models.CharField(max_length=160)
    channel_hint = models.CharField(max_length=16, choices=ChannelHint.choices)
    escalate_after_overdue_days = models.PositiveSmallIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)


class TaskStatus(models.TextChoices):
    PENDIENTE = "PENDIENTE", "Pendiente"
    HECHA = "HECHA", "Hecha"
    CANCELADA = "CANCELADA", "Cancelada"


class TaskSource(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    RULE = "RULE", "Regla"
    VISIT_NEXT_STEP = "VISIT_NEXT_STEP", "Próximo paso de la visita"
    AI = "AI", "IA"


class Task(BaseModel):
    owner = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="tasks")
    client = models.ForeignKey("crm.Client", on_delete=models.CASCADE, related_name="tasks")
    opportunity = models.ForeignKey(Opportunity, null=True, blank=True, on_delete=models.CASCADE, related_name="tasks")
    visit = models.ForeignKey("visits.Visit", null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks")
    title = models.CharField(max_length=160)
    due_at = models.DateTimeField()
    kind = models.CharField(max_length=16, choices=ChannelHint.choices, default=ChannelHint.LLAMADA)
    status = models.CharField(max_length=16, choices=TaskStatus.choices, default=TaskStatus.PENDIENTE)
    done_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=TaskSource.choices, default=TaskSource.MANUAL)
    rule = models.ForeignKey(FollowUpRule, null=True, blank=True, on_delete=models.SET_NULL)
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalated_to = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
