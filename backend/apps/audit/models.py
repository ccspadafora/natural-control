from django.db import models


class AuditLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    actor_ip = models.GenericIPAddressField(null=True, blank=True)
    device = models.ForeignKey("accounts.Device", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    action = models.CharField(max_length=60)
    entity_type = models.CharField(max_length=60)
    entity_id = models.UUIDField(null=True, blank=True, db_index=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    request_id = models.CharField(max_length=36, blank=True)
