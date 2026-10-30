from django.db import models

from apps.core.ids import uuid7


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    updated_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    is_deleted = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        abstract = True

    def bump(self) -> None:
        self.version += 1
