from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.core.models import BaseModel
from apps.visits.models import ProductKind, VisitResult


class PostVisitRule(BaseModel):
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)
    trigger_results = ArrayField(models.CharField(max_length=32, choices=VisitResult.choices), default=list, blank=True)
    requires_product_kinds = ArrayField(models.CharField(max_length=16, choices=ProductKind.choices), default=list, blank=True)
    actions = models.JSONField(default=list)
    delay_minutes = models.PositiveSmallIntegerField(default=0)


class AutomationStatus(models.TextChoices):
    PENDING = "PENDING", "Pendiente"
    RUNNING = "RUNNING", "En curso"
    DONE = "DONE", "Hecha"
    PARTIAL = "PARTIAL", "Parcial"
    FAILED = "FAILED", "Fallida"
    SKIPPED = "SKIPPED", "Omitida"


class AutomationRun(BaseModel):
    rule = models.ForeignKey(PostVisitRule, on_delete=models.PROTECT, related_name="runs")
    visit = models.ForeignKey("visits.Visit", on_delete=models.CASCADE, related_name="automation_runs")
    status = models.CharField(max_length=16, choices=AutomationStatus.choices, default=AutomationStatus.PENDING)
    idempotency_key = models.CharField(max_length=120, unique=True)
    log = models.JSONField(default=list, blank=True)
