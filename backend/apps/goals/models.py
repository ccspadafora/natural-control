from django.db import models

from apps.core.models import BaseModel


class PeriodType(models.TextChoices):
    MES = "MES", "Mes"
    SEMANA = "SEMANA", "Semana"


class Goal(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="goals")
    period_type = models.CharField(max_length=8, choices=PeriodType.choices)
    period_start = models.DateField()
    sales_budget = models.DecimalField(max_digits=16, decimal_places=2)
    visits_target = models.PositiveIntegerField()
    new_clients_target = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "period_type", "period_start"], name="goal_unique_period")
        ]


class Achievement(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="achievements")
    code = models.CharField(max_length=40)
    period_start = models.DateField(null=True, blank=True)
    awarded_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)


class ScorecardSnapshot(BaseModel):
    """HU-15.6 · GEN y atributos congelados por periodo (stub)."""

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="scorecard_snapshots")
    period_start = models.DateField()
    gen = models.PositiveSmallIntegerField(null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True)
    rank_national = models.PositiveSmallIntegerField(null=True, blank=True)
    rank_zone = models.PositiveSmallIntegerField(null=True, blank=True)
    computed_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "period_start"], name="scorecard_unique_period")
        ]


class Badge(BaseModel):
    """Insignia mensual de liga (stub)."""

    code = models.CharField(max_length=40)
    title = models.CharField(max_length=80)
    period_start = models.DateField()
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="league_badges",
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=255, blank=True)
