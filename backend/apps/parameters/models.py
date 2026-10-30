from django.db import models

from apps.core.models import BaseModel


class ValueType(models.TextChoices):
    INT = "INT", "Entero"
    DECIMAL = "DECIMAL", "Decimal"
    BOOL = "BOOL", "Booleano"
    STRING = "STRING", "Texto"
    JSON = "JSON", "JSON"
    DURATION = "DURATION", "Duración"


class SystemSetting(BaseModel):
    key = models.CharField(max_length=120, unique=True)
    value = models.JSONField()
    value_type = models.CharField(max_length=16, choices=ValueType.choices)
    description = models.CharField(max_length=300, blank=True)
    module = models.CharField(max_length=40)
    editable_by_role = models.JSONField(default=list)
    updated_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )

    def __str__(self) -> str:
        return self.key
