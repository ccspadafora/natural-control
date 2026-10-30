from django.db import models

from apps.core.models import BaseModel


class ForecastSource(models.TextChoices):
    VISITS = "VISITS", "Visitas"
    PIPELINE = "PIPELINE", "Embudo"
    BLENDED = "BLENDED", "Combinado"


class ForecastSnapshot(BaseModel):
    date = models.DateField()
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="forecast_snapshots")
    zone = models.ForeignKey("org.Zone", on_delete=models.PROTECT, related_name="forecast_snapshots")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="forecast_snapshots")
    period_month = models.DateField()
    source = models.CharField(max_length=16, choices=ForecastSource.choices)
    optimistic = models.DecimalField(max_digits=16, decimal_places=2)
    probable = models.DecimalField(max_digits=16, decimal_places=2)
    committed = models.DecimalField(max_digits=16, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["date", "user", "product", "period_month", "source"],
                name="forecast_snapshot_unique",
            )
        ]
