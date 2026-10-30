from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.core.models import BaseModel


class ReportScope(models.TextChoices):
    EMPRESA = "EMPRESA", "Empresa"
    ZONA = "ZONA", "Zona"
    RTC = "RTC", "RTC"


class ReportFrequency(models.TextChoices):
    SEMANAL = "SEMANAL", "Semanal"
    MENSUAL = "MENSUAL", "Mensual"
    MANUAL = "MANUAL", "Manual"


class ReportStatus(models.TextChoices):
    PENDING = "PENDING", "Pendiente"
    DONE = "DONE", "Listo"
    FAILED = "FAILED", "Fallido"


class AIReport(BaseModel):
    """Reservado para una fase posterior. En esta versión no se genera ningún informe con modelo."""

    scope = models.CharField(max_length=16, choices=ReportScope.choices)
    zone = models.ForeignKey("org.Zone", null=True, blank=True, on_delete=models.PROTECT)
    user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.PROTECT)
    period_start = models.DateField()
    period_end = models.DateField()
    frequency = models.CharField(max_length=16, choices=ReportFrequency.choices)
    input_snapshot = models.JSONField(default=dict)
    output = models.JSONField(default=dict)
    model = models.CharField(max_length=60, blank=True)
    prompt_version = models.CharField(max_length=20, blank=True)
    tokens_in = models.PositiveIntegerField(default=0)
    tokens_out = models.PositiveIntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    status = models.CharField(max_length=16, choices=ReportStatus.choices, default=ReportStatus.PENDING)
    pdf = models.FileField(upload_to="reports/", blank=True)
    sent_to = ArrayField(models.CharField(max_length=254), default=list, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "zone", "user", "period_start", "frequency"],
                condition=~models.Q(frequency="MANUAL"),
                name="ai_report_unique_scheduled",
            )
        ]


class ExportKind(models.TextChoices):
    VISITS_XLSX = "VISITS_XLSX", "Visitas Excel"
    VISITS_PDF = "VISITS_PDF", "Visitas PDF"
    CLIENTS_XLSX = "CLIENTS_XLSX", "Clientes Excel"
    FORECAST_XLSX = "FORECAST_XLSX", "Forecast Excel"
    AUDIT_XLSX = "AUDIT_XLSX", "Auditoría Excel"


class ExportJob(BaseModel):
    kind = models.CharField(max_length=32, choices=ExportKind.choices)
    filters = models.JSONField(default=dict)
    requested_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="exports")
    status = models.CharField(max_length=16, choices=ReportStatus.choices, default=ReportStatus.PENDING)
    file = models.FileField(upload_to="exports/", blank=True)
    row_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
