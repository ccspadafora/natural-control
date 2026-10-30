from django.db import models


class MutationResult(models.TextChoices):
    APPLIED = "APPLIED", "Aplicada"
    CONFLICT = "CONFLICT", "Conflicto"
    REJECTED = "REJECTED", "Rechazada"


class SyncMutation(models.Model):
    """Reservada para el modo sin conexión. Esta versión no expone el protocolo de sync."""

    id = models.UUIDField(primary_key=True)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="sync_mutations")
    device = models.ForeignKey("accounts.Device", on_delete=models.CASCADE, related_name="sync_mutations")
    op = models.CharField(max_length=60)
    entity_id = models.UUIDField()
    received_at = models.DateTimeField(auto_now_add=True)
    result = models.CharField(max_length=16, choices=MutationResult.choices)
    response = models.JSONField(default=dict)
